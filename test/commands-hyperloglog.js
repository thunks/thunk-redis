'use strict'

const tman = require('tman')
const should = require('should')
const thunk = require('thunks')()
const redis = require('..')

module.exports = function () {
  tman.suite('commands:HyperLogLog', function () {
    let client

    tman.before(function () {
      client = redis.createClient({
        database: 0
      })
      client.on('error', function (error) {
        console.error('redis client:', error)
      })
    })

    tman.beforeEach(function (done) {
      client.flushdb()(function (error, res) {
        should(error).be.equal(null)
        should(res).be.equal('OK')
      })(done)
    })

    tman.after(function () {
      client.clientEnd()
    })

    tman.it('client.pfadd, client.pfcount, client.pfmerge', function (done) {
      client.pfadd('db', 'Redis', 'MongoDB', 'MySQL')(function (error, res) {
        should(error).be.equal(null)
        should(res).be.equal(1)
        return thunk.all(this.pfcount('db'), this.pfadd('db', 'Redis'))
      })(function (error, res) {
        should(error).be.equal(null)
        should(res).be.eql([3, 0])
        return thunk.all(this.pfadd('db', 'PostgreSQL'), this.pfcount('db'))
      })(function (error, res) {
        should(error).be.equal(null)
        should(res).be.eql([1, 4])
        return this.pfadd('alphabet', 'a', 'b', 'c')
      })(function (error, res) {
        should(error).be.equal(null)
        should(res).be.equal(1)
        return thunk.all(this.pfcount('alphabet'), this.pfcount('alphabet', 'db'))
      })(function (error, res) {
        should(error).be.equal(null)
        should(res).be.eql([3, 7])
        return thunk.all(this.pfmerge('x', 'alphabet', 'db'), this.pfcount('x'))
      })(function (error, res) {
        should(error).be.equal(null)
        should(res).be.eql(['OK', 7])
      })(done)
    })
  })
}
