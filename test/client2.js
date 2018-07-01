'use strict'

const tman = require('tman')
const should = require('should')
const redis = require('..')

tman.suite('createClient2', function () {
  let time = '' + Date.now()

  tman.it('redis.createClient()', function (done) {
    let connect = false
    let client = redis.createClient()

    client.on('connect', function () {
      connect = true
    })
    client.info()(function (error, res) {
      should(error).be.equal(null)
      should(connect).be.equal(true)
      should(res.redis_version).be.type('string')
      return this.select(1)
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.set('test', time)
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      this.clientEnd()
    })(done)
  })

  tman.it('redis.createClient(address, options)', function (done) {
    let connect = false
    let client = redis.createClient('127.0.0.1:6379', {
      database: 1
    })

    client.on('connect', function () {
      connect = true
    })

    client.info()(function (error, res) {
      should(error).be.equal(null)
      should(connect).be.equal(true)
      should(res.redis_version).be.type('string')
      return this.clientEnd()
    })(done)
  })

  tman.it('client.migrate', function (done) {
    let client = redis.createClient()
    let client2 = redis.createClient(6380)

    client.set('key', 123)(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return client2.flushdb()
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.migrate('127.0.0.1', 6380, 'key', 0, 100)
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.exists('key')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(0)
      return client2.get('key')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('123')
    })(function () {
      this.clientEnd()
      client2.clientEnd()
    })(done)
  })
})
