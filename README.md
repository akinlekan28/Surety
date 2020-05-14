# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Version
`Truffle v5.0.8 (core: 5.0.8)`
`Solidity - ^0.4.24 (solc-js)`
`Node v11.8.0`
`Web3.js v1.0.0-beta.37`

## Install

`npm install`
`truffle compile`

## ganache-cli with 20 accounts
`ganache-cli -m "candy maple cake sugar pudding cream honeyich smooth crumble sweet treat" -a 20`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate`
`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder

## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)
