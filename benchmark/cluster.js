'use strict'

const assert = require('assert')
const thunk = require('thunks')()
const redis = require('..')
const IoRedis = require('ioredis')

thunk(function * () {
  let timeT = 0
  let timeI = 0
  const testLen = 100000
  const titleT = 'redis(T):'
  const titleI = 'redis(I):'
  const clientT = redis.createClient(7000)
  const clientI = new IoRedis.Cluster([
    { port: 7000, host: '127.0.0.1' },
    { port: 7001, host: '127.0.0.1' },
    { port: 7002, host: '127.0.0.1' }
  ])

  const queue = []
  while (queue.length < testLen) queue.push(queue.length)

  const smallStr = 'teambition'
  const longStr = (new Array(4097).join('-'))

  function printResult (title, timeT, timeI) {
    console.log(titleT, title, Math.floor(testLen * 1000 / timeT) + ' ops/sec', '100%')
    console.log(titleI, title, Math.floor(testLen * 1000 / timeI) + ' ops/sec', ((timeT / timeI) * 100).toFixed(1) + '%')
    console.log('')
  }

  console.log(titleT + 'thunk-redis\n', yield clientT.cluster('info'))
  // ioRedis cluster can't work (v1.0.6)
  console.log(titleI + 'ioRedis\n', yield function (done) { clientI.cluster('info', done) })
  console.log('Bench start:\n')

  let resT, resI

  // SET
  yield thunk.delay(100)

  timeT = Date.now()
  resT = yield queue.map(function () {
    return clientT.set('zensh_thunks_00000001', smallStr)
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  resI = yield queue.map(function () {
    return function (done) { clientI.set('zensh_thunks_00000001', smallStr, done) }
  })
  timeI = Date.now() - timeI
  printResult('SET small string', timeT, timeI)

  resT.map(function (val) {
    assert.strictEqual(val, 'OK')
  })
  resI.map(function (val) {
    assert.strictEqual(val, 'OK')
  })

  // GET
  yield thunk.delay(100)

  timeT = Date.now()
  resT = yield queue.map(function () {
    return clientT.get('zensh_thunks_00000001')
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  resI = yield queue.map(function () {
    return function (done) { clientI.get('zensh_thunks_00000001', done) }
  })
  timeI = Date.now() - timeI
  printResult('GET small string', timeT, timeI)

  resT.map(function (val) {
    assert.strictEqual(val, smallStr)
  })
  resI.map(function (val) {
    assert.strictEqual(val, smallStr)
  })

  // SET
  yield thunk.delay(100)

  timeT = Date.now()
  resT = yield queue.map(function () {
    return clientT.set('zensh_thunks_00000002', longStr)
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  resI = yield queue.map(function () {
    return function (done) { clientI.set('zensh_thunks_00000002', longStr, done) }
  })
  timeI = Date.now() - timeI
  printResult('SET long string', timeT, timeI)

  resT.map(function (val) {
    assert.strictEqual(val, 'OK')
  })
  resI.map(function (val) {
    assert.strictEqual(val, 'OK')
  })

  // GET
  yield thunk.delay(100)

  timeT = Date.now()
  resT = yield queue.map(function () {
    return clientT.get('zensh_thunks_00000002')
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  resI = yield queue.map(function () {
    return function (done) { clientI.get('zensh_thunks_00000002', done) }
  })
  timeI = Date.now() - timeI
  printResult('GET long string', timeT, timeI)

  resT.map(function (val) {
    assert.strictEqual(val, longStr)
  })
  resI.map(function (val) {
    assert.strictEqual(val, longStr)
  })

  // INCR
  yield thunk.delay(100)

  timeT = Date.now()
  yield queue.map(function () {
    return clientT.incr('zensh_thunks_00000003')
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  yield queue.map(function () {
    return function (done) { clientI.incr('zensh_thunks_00000003', done) }
  })
  timeI = Date.now() - timeI
  printResult('INCR', timeT, timeI)

  // LPUSH
  yield thunk.delay(100)

  timeT = Date.now()
  yield queue.map(function () {
    return clientT.lpush('zensh_thunks_00000004', smallStr)
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  yield queue.map(function () {
    return function (done) { clientI.lpush('zensh_thunks_00000004', smallStr, done) }
  })
  timeI = Date.now() - timeI
  printResult('LPUSH', timeT, timeI)

  // LRANGE
  yield thunk.delay(100)

  timeT = Date.now()
  yield queue.map(function () {
    return clientT.lrange('zensh_thunks_00000004', '0', '100')
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  yield queue.map(function () {
    return function (done) { clientI.lrange('zensh_thunks_00000004', '0', '100', done) }
  })
  timeI = Date.now() - timeI
  printResult('LRANGE 100', timeT, timeI)

  yield thunk.delay(100)
  process.exit()
})()
