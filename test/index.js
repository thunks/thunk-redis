'use strict'

const tman = require('tman')
const should = require('should')
const redis = require('..')
const clientTest = require('./client')
const commandsConnection = require('./commands-connection')
const commandsGeo = require('./commands-geo')
const commandsHash = require('./commands-hash')
const commandsKey = require('./commands-key')
const commandsList = require('./commands-list')
const commandsPubsub = require('./commands-pubsub')
const commandsScript = require('./commands-script')
const commandsHyperLogLog = require('./commands-hyperloglog')
const commandsServer = require('./commands-server')
const commandsSet = require('./commands-set')
const commandsSortedSet = require('./commands-sorted-set')
const commandsString = require('./commands-string')
const commandsTransaction = require('./commands-transaction')

tman.suite('thunk-redis', function () {
  tman.before(function (done) {
    redis.createClient({
      database: 0
    }).flushall()(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.dbsize()
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(0)
      return this.select(1)
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.flushdb()
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.dbsize()
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(0)
      this.clientEnd()
    })(done)
  })

  tman.after(function () {
    setTimeout(function () {
      process.exit()
    }, 1000)
  })

  clientTest()

  commandsKey()
  commandsSet()
  commandsGeo()
  commandsHash()
  commandsList()
  commandsPubsub()
  commandsScript()
  commandsServer()
  commandsString()
  commandsSortedSet()
  commandsConnection()
  commandsHyperLogLog()
  commandsTransaction()

  try {
    let check = new Function('return function* (){}') // eslint-disable-line
    require('./chaos')()
  } catch (e) {
    console.log('Not support generator!')
  }
})
