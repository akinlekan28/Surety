const Test = require('../config/testConfig.js');
const truffleAssert = require('truffle-assertions')

contract('Oracles', async (accounts) => {

    const TEST_ORACLES_COUNT = 5;

    const STATUS_CODE_UNKNOWN = 0;
    const STATUS_CODE_ON_TIME = 10;
    const STATUS_CODE_LATE_AIRLINE = 20;
    const STATUS_CODE_LATE_WEATHER = 30;
    const STATUS_CODE_LATE_TECHNICAL = 40;
    const STATUS_CODE_LATE_OTHER = 50;
    
    var config;
    
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    it('can register oracles', async () => {
       let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
       for(let i=1; i < TEST_ORACLES_COUNT; i++) {      
           await config.flightSuretyApp.registerOracle({ from: accounts[i], value: fee });
           let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[i]});
           console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
       }
    });

    it('can request flight status', async () => {
        let flight = 'ND1309';
        let timestamp = Math.floor(Date.now() / 1000);
        let price = web3.utils.toWei('0.5', 'ether');

        let fee = await config.flightSuretyApp.REGISTRATION_FEE();
        await config.flightSuretyApp.fund({from: config.firstAirline, value: fee});
        await config.flightSuretyApp.registerFlight(flight, price, timestamp, {from: accounts[1]});

        for(let i=1; i < TEST_ORACLES_COUNT; i++) {
            const result = await config.flightSuretyApp.fetchFlightStatus(accounts[i], flight, timestamp);
            truffleAssert.eventEmitted(result, 'OracleRequest', ev => {
                console.log(`OracleRequest ${ev.airline}, ${ev.flight}, ${ev.timestamp}, ${ev.isOpen}`);
                return ev.airline === accounts[i] && ev.flight == 'ND1309' && ev.timestamp == timestamp && ev.isOpen;
            });

            let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({from: accounts[i]});
            
            for(let j=0; j < 3; j++) {
                try {
                    const result = await config.flightSuretyApp.submitOracleResponse(oracleIndexes[j], config.firstAirline, flight, timestamp, STATUS_CODE_ON_TIME, {from: accounts[i]});
                    
                    truffleAssert.eventEmitted(result, 'OracleReport', ev => {
                        console.log(`OracleReport ${ev.airline}, ${ev.flight}, ${ev.timestamp}, ${ev.status}`);
                        return ev.airline === accounts[i] && ev.flight == 'ND1309' && ev.timestamp == timestamp && ev.status == STATUS_CODE_ON_TIME;
                    });
                }
                catch(e) {
                    
                }
            }
        }
    });
});
