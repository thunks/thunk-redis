/*global describe, it, before, after*/

var assert = require('assert')
var thunk = require('thunks')()
var redis = require('..')
var clientM = redis.createClient(6390)
var clientS = redis.createClient(6391, {onlyMaster: false})

clientM.on('error', function (err) {
  console.log('clientM', JSON.stringify(err))
})
clientS.on('error', function (err) {
  console.log('clientS', JSON.stringify(err))
})

before(function * () {
  yield clientM.flushall()
  yield clientS.info()
})

after(function * () {
  yield thunk.delay(1000)
  process.exit()
})

describe('replication test', function () {
  it('isMaster', function () {
    assert.strictEqual(clientM._redisState.getConnection(-1).isMaster, true)
    assert.strictEqual(clientS._redisState.getConnection(-1).isMaster, false)
  })

  it('sync keys', function * () {
    var value = String(Date.now())

    assert.strictEqual((yield clientM.set('key1', value)), 'OK')
    assert.strictEqual((yield clientM.set('key2', value)), 'OK')
    yield thunk.delay(100)
    assert.strictEqual((yield clientS.get('key1')), value)
    assert.strictEqual((yield clientS.get('key2')), value)
  })
})
