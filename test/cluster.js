'use strict'
/*global describe, it, before, after*/

var assert = require('assert')
var thunk = require('thunks')()
var redis = require('../index')
var client = redis.createClient(7000)
var count = 50000

before(function (done) {
  client.info()(done)
})

after(function () {
  setTimeout(function () {
    process.exit()
  }, 1000)
})

describe('cluster test', function () {
  it('create 50000 keys', function (done) {
    thunk(function *() {
      var task = []
      var len = count
      while (len--) {
        task.push(thunk(len + '')(function *(err, res) {
          assert.strictEqual(err, null)
          assert.strictEqual((yield client.set(res, res)), 'OK')
          assert.strictEqual((yield client.get(res)), res)
        }))
      }
      yield thunk.all(task)
    })(done)
  })

  it('get 50000 keys', function (done) {
    thunk(function *() {
      var task = []
      var len = count
      while (len--) {
        task.push(thunk(len + '')(function *(err, res) {
          assert.strictEqual(err, null)
          assert.strictEqual((yield client.get(res)), res)
        }))
      }
      yield thunk.all(task)
    })(done)
  })

  it('transaction', function (done) {
    thunk(function *() {
      for (let i = 0; i < count; i++) {
        let res = yield [
          client.multi(i),
          client.set(i, i),
          client.get(i),
          client.exec(i)
        ]
        assert.strictEqual(res[0], 'OK')
        assert.strictEqual(res[1], 'QUEUED')
        assert.strictEqual(res[2], 'QUEUED')
        assert.strictEqual(res[3][0], 'OK')
        assert.strictEqual(res[3][1], i + '')
      }
    })(done)
  })

  it('kill a master', function (done) {
    thunk(function *() {
      var task = []
      var result = {}
      var len = 10000

      client.on('warn', function (err) {
        console.log(err)
      })

      thunk.delay(100)(function () {
        // kill the default master node
        client.debug('segfault')()
      })

      while (len--) {
        task.push(thunk(len + '')(function *(err, res) {
          assert.strictEqual(err, null)
          return yield client.get(res)
        })(function (err, res) {
          assert.strictEqual(err, null)
          result[res] = true
        }))
        yield thunk.delay(5)
      }
      yield thunk.all(task)
      len = 10000
      while (len--) assert.strictEqual(result[len], true)
    })(done)
  })
})
