'use strict'

const tman = require('tman')
const assert = require('assert')
const thunk = require('thunks')()
const redis = require('..')
const clientM = redis.createClient(6390)
const clientS = redis.createClient(6391, { onlyMaster: false })

clientM.on('error', function (err) {
  console.log('clientM', JSON.stringify(err))
})
clientS.on('error', function (err) {
  console.log('clientS', JSON.stringify(err))
})

tman.before(function * () {
  yield clientM.flushall()
  yield clientS.info()
})

tman.after(function * () {
  yield thunk.delay(1000)
  process.exit()
})

tman.suite('replication test', function () {
  tman.it('isMaster', function () {
    assert.strictEqual(clientM._redisState.getConnection(-1).isMaster, true)
    assert.strictEqual(clientS._redisState.getConnection(-1).isMaster, false)
  })

  tman.it('sync keys', function * () {
    const value = String(Date.now())

    assert.strictEqual((yield clientM.set('key1', value)), 'OK')
    assert.strictEqual((yield clientM.set('key2', value)), 'OK')
    yield thunk.delay(100)
    assert.strictEqual((yield clientS.get('key1')), value)
    assert.strictEqual((yield clientS.get('key2')), value)
  })
})
