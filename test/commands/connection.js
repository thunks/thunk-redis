'use strict'

const tman = require('tman')
const should = require('should')
const redis = require('../..')

tman.suite('commands:Connection', function () {
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

  tman.it('client.echo', function (done) {
    client.echo('hello world!')(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('hello world!')
      return this.echo(123)
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('123')
    })(done)
  })

  tman.it('client.ping', function (done) {
    client.ping()(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('PONG')
    })(done)
  })

  tman.it('client.select', function (done) {
    client.select(10)(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.select(99)
    })(function (error, res) {
      should(error).be.instanceOf(Error)
      should(res).be.equal(undefined)
    })(done)
  })

  tman.it('client.auth', function (done) {
    client.auth('123456')(function (error, res) {
      should(error).be.instanceOf(Error)
      should(res).be.equal(undefined)
      return this.config('set', 'requirepass', '123456')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.auth('123456')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.config('set', 'requirepass', '')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
    })(done)
  })

  tman.it('client.quit', function (done) {
    client.quit()(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
    })(done)
  })
})
