import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
require('babel-polyfill');

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0]
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

console.log("starting oracle server...")

const Server = {
    states: {
        0: 'unknown',
        10: 'late due to airline',
        20: 'late due to weather',
        30: 'late due to technical reason',
        40: 'late due to other reason'
    },

    start: async () => {
        flightSuretyApp.events.OracleRequest()
          .on('error', error => { 
              console.error(error)
          })
          .on('data', async log => {
              let result = log.returnValues;
              console.log(`Oracle Request => ${result.airline}, flight: ${result.flight}, timestamp: ${result.timestamp}`)
              await Server.submitResponses(result.airline, result.flight, result.timestamp);
          });

         flightSuretyData.events.AirlineRegistered()
             .on('data', log => {
                 let result = log.returnValues;
                 console.log(`${result.airline} has been registered`);
             })
             .on('error', error => { 
                 console.error(error)
             });

         flightSuretyData.events.Funded()
             .on('data', log => {
                 let result = log.returnValues;
                 console.log(`${result.airline} has funded 10 ETH`);
             })
             .on('error', error => { 
                 console.error(error)
             });

         flightSuretyData.events.FlightRegistered()
            .on('data', async log => {
                let result = log.returnValues;
                console.log(`flight registered =>  airline: ${result.airline}, flight: ${result.flight}, timestamp: ${result.timestamp}, price: ${result.price}`);
            })
            .on('error', error => { 
                console.error(error)
            });

         flightSuretyData.events.Paid()
             .on('data', log => {
                 let result = log.returnValues;
                 console.log(`Paid => recipient: ${result.recipient}, amount: ${result.amount}`);
             })
             .on('error', error => { 
                 console.error(error)
             });

         flightSuretyData.events.Credited()
             .on('data', log => {
                 let result = log.returnValues;
                 console.log(`credited => passenger: ${result.passenger}, amount: ${result.amount}`);
             })
             .on('error', error => { 
                 console.error(error)
             });

         flightSuretyData.events.BoughtTicket()
             .on('data', log => {
                 let result = log.returnValues;
                 console.log(`bought ticket => passenger: ${result.passenger}, insurance: ${result.amount}`);
             })
             .on('error', error => { 
                 console.error(error)
             });

         flightSuretyApp.events.OracleReport()
             .on('data', log => {})
             .on('error', error => { 
                 console.error(error)
             });

         flightSuretyApp.events.WithdrawRequest()
             .on('data', log => {
                 let result = log.returnValues;
                 console.log(`WithdrawRequest => recipient: ${result.recipient}`);
             })
             .on('error', error => { 
                 console.error(error)
             });

         flightSuretyApp.events.FlightProcessed()
             .on('data', log => {
                 let result = log.returnValues;
                 console.log(`FlightProcessed => airline: ${result.flight},  flight: ${result.timestamp}, statusCode: ${result.statusCode}`);
             })
             .on('error', error => { 
                 console.error(error)
             });

        await flightSuretyData.methods.authorizeCaller(flightSuretyApp.address);
        let accounts = await web3.eth.getAccounts();
        console.log(accounts);
        const REGISTRATION_FEE = await flightSuretyApp.methods.REGISTRATION_FEE().call();
        accounts.forEach(async account => {
            try{
                await flightSuretyApp.methods.registerOracle().send({from: account, value: REGISTRATION_FEE, gas: 4712388, gasPrice: 100000000000});
                let indexes = await flightSuretyApp.methods.getMyIndexes().call({from: account});
                console.log(indexes);
            }catch(error) {
                console.error(error)
            }
        });
    },

    submitResponses: async (airline, flight, timestamp) => {
         let accounts = await web3.eth.getAccounts();
         let statusCode = (Math.floor(Math.random() * 5) + 1) * 10;
         accounts.forEach(async account => {
             let oracleIndexes = await flightSuretyApp.methods.getMyIndexes().call({from:account});
             oracleIndexes.forEach(async index => {
                 try { 
                     await flightSuretyApp.methods.submitOracleResponse(index, airline, flight, +timestamp, statusCode).send({from:account, gas: 4712388, gasPrice: 100000000000});
                 }catch (error) {
                     console.error(error)
                 }
             })
         })
    }
}

Server.start();

const app = express();
app.get('/api', (req, res) => {
    res.send({
        message: 'An API for use with your Dapp!'
    });
});

export default app;


