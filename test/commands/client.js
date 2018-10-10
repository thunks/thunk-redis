'use strict'

const tman = require('tman')
const should = require('should')
const thunk = require('thunks').thunk
const redis = require('../..')

tman.suite('createClient', function () {
  const time = '' + Date.now()

  tman.it('redis.createClient()', function (done) {
    let connect = false
    const client = redis.createClient()

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

  tman.it('redis.createClient(options)', function (done) {
    const client = redis.createClient({
      database: 1
    })

    client.get('test')(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(time)
      this.clientEnd()
    })(done)
  })

  tman.it('redis.createClient({usePromise: true})', function (done) {
    if (typeof Promise !== 'function') return done()
    const client = redis.createClient({
      usePromise: true
    })
    const promise = client.info()
    should(promise).be.instanceof(Promise)
    promise.then(function (res) {
      done()
    }, done)
  })

  tman.it('redis.createClient({usePromise: Promise})', function (done) {
    const client = redis.createClient({
      usePromise: Promise
    })
    const promise = client.info()
    should(promise).be.instanceof(Promise)
    promise.then(function (res) {
      done()
    }, done)
  })

  tman.it('redis.createClient(port, options)', function (done) {
    const client = redis.createClient(6379, {
      database: 1
    })

    client.get('test')(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(time)
      this.clientEnd()
    })(done)
  })

  tman.it('redis.createClient(port, host, options)', function (done) {
    const client = redis.createClient(6379, 'localhost', {
      database: 1
    })

    client.get('test')(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(time)
      this.clientEnd()
    })(done)
  })

  tman.it('redis.createClient(redisUrl, options) with error', function (done) {
    const client = redis.createClient('redis://USER:PASS@localhost:6379', {
      database: 1
    })

    client.on('error', function (error) {
      should(error.message).be.containEql('AUTH')
      should(error.message).be.containEql('no password')
      done()
    })
  })

  tman.it('redis.createClient(redisUrl, options)', function (done) {
    const client = redis.createClient('redis://localhost:6379', {
      database: 1
    })
    let client2 = null

    client.get('test')(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(time)
      return this.config('set', 'requirepass', '123456')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      this.clientEnd()
      client2 = redis.createClient(['redis://123456@localhost:6379'], {
        database: 1
      })
      return client2.get('test')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(time)
      return client2.config('set', 'requirepass', '')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
    })(done)
  })
})

tman.suite('client method', function () {
  tman.it('client.clientConnect, client.clientEnd and options.pingInterval', function (done) {
    const client = redis.createClient(6379, {
      pingInterval: 500
    })

    const _ping = client.ping
    const pingCount = 0
    let _pingCount = 0
    client.ping = function () {
      return _ping.call(client)(function (err, res) {
        if (err) throw err
        _pingCount++
        return res
      })
    }

    thunk.delay(2200)(function () {
      const pingCount = _pingCount
      should(pingCount >= 4).be.equal(true)
      client.clientEnd()
      return thunk.delay(1000)
    })(function () {
      should(pingCount).be.equal(_pingCount)
      client.clientConnect()
      return thunk.delay(1200)
    })(function () {
      should(_pingCount >= (pingCount + 2)).be.equal(true)
      client.clientEnd()
    })(done)
  })
})
