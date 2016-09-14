/* global describe, it */

const should = require('should')
const thunk = require('thunks')()
const redis = require('..')

module.exports = function () {
  describe('createClient', function () {
    var time = '' + Date.now()

    it('redis.createClient()', function (done) {
      var connect = false
      var client = redis.createClient()

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

    it('redis.createClient(options)', function (done) {
      var client = redis.createClient({
        database: 1
      })

      client.get('test')(function (error, res) {
        should(error).be.equal(null)
        should(res).be.equal(time)
        this.clientEnd()
      })(done)
    })

    it('redis.createClient({usePromise: true})', function (done) {
      if (typeof Promise !== 'function') return done()
      var client = redis.createClient({
        usePromise: true
      })
      var promise = client.info()
      should(promise).be.instanceof(Promise)
      promise.then(function (res) {
        done()
      }, done)
    })

    it('redis.createClient({usePromise: Promise})', function (done) {
      var client = redis.createClient({
        usePromise: Promise
      })
      var promise = client.info()
      should(promise).be.instanceof(Promise)
      promise.then(function (res) {
        done()
      }, done)
    })

    it('redis.createClient(port, options)', function (done) {
      var client = redis.createClient(6379, {
        database: 1
      })

      client.get('test')(function (error, res) {
        should(error).be.equal(null)
        should(res).be.equal(time)
        this.clientEnd()
      })(done)
    })

    it('redis.createClient(port, host, options)', function (done) {
      var client = redis.createClient(6379, 'localhost', {
        database: 1
      })

      client.get('test')(function (error, res) {
        should(error).be.equal(null)
        should(res).be.equal(time)
        this.clientEnd()
      })(done)
    })

    it('redis.createClient(redisUrl, options) with error', function (done) {
      var client = redis.createClient('redis://USER:PASS@localhost:6379', {
        database: 1
      })

      client.on('error', function (error) {
        should(error.message).be.containEql('AUTH')
        should(error.message).be.containEql('no password')
        done()
      })
    })

    it('redis.createClient(redisUrl, options)', function (done) {
      var client = redis.createClient('redis://localhost:6379', {
        database: 1
      })
      var client2 = null

      client.get('test')(function (error, res) {
        should(error).be.equal(null)
        should(res).be.equal(time)
        return this.config('set', 'requirepass', '123456')
      })(function (error, res) {
        should(error).be.equal(null)
        should(res).be.equal('OK')
        this.clientEnd()
        client2 = redis.createClient('redis://123456@localhost:6379', {
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

  describe('client method', function () {
    it('client.clientConnect, client.clientEnd and options.pingInterval', function (done) {
      var client = redis.createClient(6379, {
        pingInterval: 500
      })

      var _ping = client.ping
      var pingCount = 0
      var _pingCount = 0
      client.ping = function () {
        return _ping.call(client)(function (err, res) {
          if (err) throw err
          _pingCount++
          return res
        })
      }

      thunk.delay(2200)(function () {
        var pingCount = _pingCount
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
}
