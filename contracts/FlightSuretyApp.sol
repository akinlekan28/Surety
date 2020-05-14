pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 public constant REGISTRATION_FEE = 10 ether;

    address private contractOwner;
    bool private operational = true;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }

    mapping(bytes32 => Flight) private flights;
    mapping(address => address[]) internal votes;

    FlightSuretyData flightSuretyData;

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(true, "Contract is currently not operational");
        _;
    }

    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier valWithinRange(uint256 val, uint256 low, uint256 up) {
        require(val < up, "Value higher than max allowed");
        require(val > low, "Value lower than min allowed");
        _;
    }

    /********************************************************************************************/
    /*                                       Events                                             */
    /********************************************************************************************/
    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );
    event OracleRequest(
        address airline,
        string flight,
        uint256 timestamp,
        bool isOpen
    );
    event WithdrawRequest(address recipient);
    event FlightProcessed(string flight, uint256 timestamp, uint8 statusCode);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContract) public {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns (bool) {
        return operational;
    }

    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */

    function registerAirline(address account) external {
        if (flightSuretyData.totalAirlines() < 4) {
            require(
                flightSuretyData.firstAirline() == msg.sender,
                "Until 4 airlines are registered only first airline registered can register new ones"
            );
            flightSuretyData.registerAirline(account);
        } else {
            bool isDuplicate = false;
            for (uint256 i = 0; i < votes[account].length; i++) {
                if (votes[account][i] == msg.sender) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "Caller has already registered.");
            votes[account].push(msg.sender);

            if (votes[account].length >= flightSuretyData.totalAirlines() / 2) {
                votes[account] = new address[](0);
                flightSuretyData.registerAirline(account);
            }
        }
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */

    function registerFlight(string flight, uint256 price, uint256 timestamp)
        external
    {
        flightSuretyData.registerFlight(flight, price, timestamp, msg.sender);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */

    function processFlightStatus(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal requireIsOperational {
        bytes32 flightKey = keccak256(
            abi.encodePacked(airline, flight, timestamp)
        );
        flightSuretyData.processFlightStatus(flightKey, statusCode);
        if (statusCode == 20) {
            flightSuretyData.creditInsurees(flightKey);
        }
        emit FlightProcessed(flight, timestamp, statusCode);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp
    ) external {
        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(
            airline,
            flight,
            timestamp,
            oracleResponses[key].isOpen
        );
    }

    function buy(
        address airline,
        string flight,
        uint256 timestamp,
        uint256 amount
    )
        external
        payable
        valWithinRange(amount, 0, 1.05 ether)
        requireIsOperational
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flightSuretyData.buy.value(msg.value)(
            flightKey,
            amount.mul(3).div(2),
            msg.sender
        );
    }

    function withdraw() external requireIsOperational {
        flightSuretyData.pay(msg.sender);
        emit WithdrawRequest(msg.sender);
    }

    function fund() external payable requireIsOperational {
        require(msg.value == REGISTRATION_FEE, "Registration fee is required");
        flightSuretyData.fund.value(msg.value)(msg.sender);
    }

    function airlineRegistered(address airline) external view returns (bool) {
        return flightSuretyData.isAirlineRegisterd(airline);
    }

    function funded(address airline) external view returns (bool) {
        return flightSuretyData.hasFunded(airline);
    }

    function getCredit(address passenger) external view returns (uint256) {
        return flightSuretyData.getCreditByPassenger(passenger);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant ORACLE_REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    function registerOracle() external payable {
        require(
            msg.value >= ORACLE_REGISTRATION_FEE,
            "Registration fee is required"
        );
        uint8[3] memory indexes = generateIndexes(msg.sender);
        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3]) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );
        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(abi.encodePacked(airline, flight, timestamp));
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information is not verified until at least MIN_RESPONSES
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(address airline, string flight, uint256 timestamp)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }
        return random;
    }
}


contract FlightSuretyData {
    function registerAirline(address account) external;

    function buy(bytes32 flightKey, uint256 amount, address originAddress)
        external
        payable;

    function totalAirlines() external view returns (uint256);

    function firstAirline() external view returns (address);

    function registerFlight(
        string flight,
        uint256 price,
        uint256 timestamp,
        address airline
    ) external;

    function processFlightStatus(bytes32 flightKey, uint8 statusCode) external;

    function pay(address originAddress) external;

    function fund(address originAddress) external payable;

    function isAirlineRegisterd(address originAddress)
        external
        view
        returns (bool);

    function hasFunded(address airline) public view returns (bool);

    function creditInsurees(bytes32 flightKey) external;

    function getCreditByPassenger(address originAddress)
        external
        view
        returns (uint256);
}
