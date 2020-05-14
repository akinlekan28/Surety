var Test = require('../config/testConfig.js')
var BigNumber = require('bignumber.js')

contract('Flight Surety Tests', async (accounts) => {
  var config

  before('setup contract', async () => {
    config = await Test.Config(accounts)
    await config.flightSuretyData.authorizeCaller(
      config.flightSuretyApp.address,
    )
  })

  it('First account is firstAirline', async () => {
    assert.equal(config.firstAirline, accounts[1])
    console.log('firstAirline: ' + config.firstAirline)

    let firstAirline = await config.flightSuretyData.firstAirline()
    assert.equal(config.firstAirline, firstAirline)

    let totalAirlines = await config.flightSuretyData.totalAirlines()
    assert.equal(totalAirlines, 1)
  })

  it('(Data) Initial operational value is correct', async function () {
    let status = await config.flightSuretyData.operational()
    assert(status, 'Incorrect inital operational value')
  })

  it('(Data)  non-contract owner cannot change opearational status', async function () {
    let accessDenied = false
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      })
    } catch (e) {
      accessDenied = true
    }
    assert(accessDenied, 'Must block non-contract owner access')
  })

  it('(Data) Contract owner can change operational status', async function () {
    await config.flightSuretyData.setOperatingStatus(false)
    assert.equal(
      await config.flightSuretyData.operational(),
      false,
      'Failed to change operational status',
    )
    await config.flightSuretyData.setOperatingStatus(true)
  })

  it('(Data) Operational status must be true to authorize caller', async function () {
    await config.flightSuretyData.setOperatingStatus(false)
    let reverted = false
    try {
      await config.flightSuretyData.authorizeCaller(config.testAddresses[3], {
        from: config.testAddresses[2],
      })
    } catch (e) {
      reverted = true
    }
    assert(reverted, 'Failed to change operational status')
    await config.flightSuretyData.setOperatingStatus(true)
  })

  it('(Data) Non-contract owner cannot authorize others', async function () {
    let reverted = false
    try {
      await config.flightSuretyData.authorizeCaller(config.testAddresses[3], {
        from: config.testAddresses[2],
      })
    } catch (e) {
      reverted = true
    }
    assert(reverted, 'Failed to change operational status')
  })

  it('(Data) Must be funded before registering new airline', async function () {
    let reverted = false
    try {
      await config.flightSuretyApp.registerAirline(
        config.firstAirline,
        accounts[2],
        { from: config.firstAirline },
      )
    } catch (e) {
      reverted = true
    }
    assert(reverted, 'Must be funded before registering new airline')
  })

  it('(Data) After funding can register new airline', async function () {
    await config.flightSuretyApp.registerAirline(accounts[2], {
      from: config.firstAirline,
    })
    let registered = await config.flightSuretyApp.airlineRegistered(accounts[2])
    assert(registered)

    let value = await config.flightSuretyApp.REGISTRATION_FEE()
    await config.flightSuretyApp.fund({ from: config.firstAirline, value })

    let funded = await config.flightSuretyApp.funded(config.firstAirline)
    assert(funded, 'Must be funded')
  })

  it('(multiparty) Only first Airline can register an airline when less than 4 airlines are registered', async () => {
    let value = await config.flightSuretyApp.REGISTRATION_FEE()
    await config.flightSuretyApp.registerAirline(accounts[2], {
      from: config.firstAirline,
    })
    await config.flightSuretyApp.fund({ from: accounts[2], value })
    let airline = await config.flightSuretyData.airlineProfiles(accounts[2])
    assert(airline[0], 'Registration for the second airline failed')
  })

  it('(multiparty) Starting from 4 airlines, half of the registered airlines must agree to register a new one', async () => {
    await config.flightSuretyApp.registerAirline(accounts[3], {
      from: config.firstAirline,
    })
    await config.flightSuretyApp.registerAirline(accounts[4], {
      from: config.firstAirline,
    })
    assert.equal(await config.flightSuretyData.totalAirlines(), 4)

    await config.flightSuretyApp.registerAirline(accounts[5], {
      from: config.firstAirline,
    })
    let airline = await config.flightSuretyData.airlineProfiles(accounts[5])
    assert.equal(
      airline[0],
      false,
      '5th airline registration should have failed',
    )

    await config.flightSuretyApp.registerAirline(accounts[5], {
      from: accounts[2],
    })
    let airline5 = await config.flightSuretyData.airlineProfiles(accounts[5])
    assert(airline5[0], '5th airline registration failed')
  })

  it('(airline) Can register a flight', async () => {
    let timestamp = 1558232053
    let flight = 'NDB01'
    let price = web3.utils.toWei('0.5', 'ether')

    await config.flightSuretyApp.registerFlight(flight, price, timestamp, {
      from: config.firstAirline,
    })
    let flightKey = await config.flightSuretyApp.getFlightKey(
      config.firstAirline,
      flight,
      timestamp,
    )
    let fetchedFlight = await config.flightSuretyData.flights(flightKey)
    assert(fetchedFlight[0], 'flight was not registered')
  })

  it('(passenger) Can book a flight and subscribe an insurance', async () => {
    let timestamp = 1558232053
    let flight = 'NDB01'
    let price = web3.utils.toWei('0.5', 'ether')
    let insurancePayment = web3.utils.toWei('0.1', 'ether')

    await config.flightSuretyApp.buy(
      config.firstAirline,
      flight,
      timestamp,
      insurancePayment,
      { from: accounts[9], value: +price + +insurancePayment },
    )
    let insuranceCredit = await config.flightSuretyData.subscribedInsurance(
      config.firstAirline,
      flight,
      timestamp,
      accounts[9],
    )
    assert.equal(insuranceCredit.toString(), '150000000000000000')
  })
})
