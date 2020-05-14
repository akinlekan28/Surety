import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.firstAirline = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];
            this.firstAirline = accts[1];
            this.passenger = accts[2];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            this.flightSuretyApp.methods
                .registerAirline(this.firstAirline)
                .send({from: this.firstAirline}, (error, result) => {
                    if (error) {
                        console.log(error);
                    }
                });

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({from: self.owner}, callback);
    }

    registerAirline(address, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerAirline(address)
            .send({from: self.firstAirline}, (error, result) => {
                callback(error, result);
            });
    }

    checkRegistration(address, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .airlineRegistered(address)
            .call({from: self.firstAirline}, callback);
    }

    submitFund(callback) {
        let self = this;

        let fee = self.web3.utils.toWei('10', 'ether');
        self.flightSuretyApp.methods
            .fund()
            .send({from: self.firstAirline, value: fee}, (error, result) => {
                callback(error, result);
            });
    }

    registerFlight(flight, callback) {
        let self = this;

        let price = self.web3.utils.toWei('0.5', 'ether');
        let timestamp = 1558232053;

        self.flightSuretyApp.methods
            .registerFlight(flight, price, timestamp)
            .send({from: self.firstAirline, gas: "220000"}, (error, result) => {
                callback(error, result);
            });
    }

    bookFlight(flight, insuranceAmount, callback) {
        let self = this;

        let timestamp = 1558232053;
        let price = self.web3.utils.toWei(insuranceAmount, 'ether');

        self.flightSuretyApp.methods
            .buy(self.firstAirline, flight, timestamp, price)
            .send({from: self.passenger, gas: "220000"}, (error, result) => {
                callback(error, result);
            });
    }

    withdraw(originAddress, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .withdraw()
            .send({from: originAddress, gas: "220000"}, (error, result) => {
                callback(error, result);
            });
    }

    getCredit(originAddress, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getCredit(originAddress)
            .call({from: originAddress, gas: "220000"}, (error, result) => {
                callback(error, self.web3.utils.fromWei(result));
            });
    }

    getBalance(originAddress, callback) {
        let self = this;
        self.web3.eth.getBalance(originAddress, (error, result) => {
            callback(error, self.web3.utils.fromWei(result));
        });
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: 1558232053
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
}