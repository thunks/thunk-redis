'use strict'

const thunk = require('thunks')()
const redis = require('..')
const nodeRedis = require('redis')
const IoRedis = require('ioredis')
// const co = require('co')

// test in thunks(thunk base)
thunk(bench)(console.log.bind(console))

// // test in co(promise base)
// co(bench)
//   .then(console.log.bind(console))
//   .catch(console.error.bind(console))

function * bench () {
  var timeN = 0
  var timeT = 0
  var timeI = 0
  var testLen = 100000
  var titleN = 'redis(N):'
  var titleT = 'redis(T):'
  var titleI = 'redis(I):'
  var clientN = nodeRedis.createClient(6380)
  var clientT = redis.createClient(6381)
  var clientI = new IoRedis(6382)

  var queue = []
  while (queue.length < testLen) queue.push(queue.length)

  var smallStr = 'teambition'
  var longStr = (new Array(4097).join('-'))

  function printResult (title, timeN, timeT, timeI) {
    console.log(`\n${title}:`)
    console.log(titleN, `${timeN}ms`, Math.floor(testLen * 1000 / timeN) + 'ops/sec', '100%')
    console.log(titleT, `${timeT}ms`, Math.floor(testLen * 1000 / timeT) + 'ops/sec', ((timeN / timeT) * 100).toFixed(1) + '%')
    console.log(titleI, `${timeI}ms`, Math.floor(testLen * 1000 / timeI) + 'ops/sec', ((timeN / timeI) * 100).toFixed(1) + '%')
  }

  console.log(titleN + 'node_redis ', yield function (done) { clientN.flushdb(done) })
  console.log(titleT + 'thunk-redis ', yield clientT.flushdb())
  console.log(titleI + 'ioRedis ', yield clientI.flushdb())
  console.log(`Bench start:(${testLen})\n`)

  // PING concurrency(full thread)
  yield thunk.delay(100)

  timeN = Date.now()
  yield queue.map(function () {
    return function (done) { clientN.ping(done) }
  })
  timeN = Date.now() - timeN

  yield thunk.delay(100)

  timeT = Date.now()
  yield queue.map(function () {
    return clientT.ping()
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  yield queue.map(function () {
    return clientI.ping()
  })
  timeI = Date.now() - timeI
  printResult('PING concurrency(full thread)', timeN, timeT, timeI)

  // PING concurrency(1000 thread)
  yield thunk.delay(100)

  timeN = Date.now()
  yield function *() {
    let count = queue.length
    yield queue.slice(0, 1000).map(function () {
      return next
    })

    function next (callback) {
      if (count > 0) {
        count--
        clientN.ping(function (err) {
          if (!err) next(callback)
          else callback(err)
        })
      } else callback()
    }
  }
  timeN = Date.now() - timeN

  yield thunk.delay(100)

  timeT = Date.now()
  yield function *() {
    let count = queue.length
    yield queue.slice(0, 1000).map(function () {
      return next
    })

    function next (callback) {
      if (count > 0) {
        count--
        clientT.ping()(function (err) {
          if (!err) next(callback)
          else callback(err)
        })
      } else callback()
    }
  }
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  yield function *() {
    let count = queue.length
    yield queue.slice(0, 1000).map(function () {
      return next
    })

    function next (callback) {
      if (count > 0) {
        count--
        clientI.ping()
          .then(function () {
            next(callback)
          })
          .catch(callback)
      } else callback()
    }
  }
  timeI = Date.now() - timeI
  printResult('PING concurrency(1000 thread)', timeN, timeT, timeI)

  // PING sequential 1 by 1
  yield thunk.delay(100)

  timeN = Date.now()
  for (let i = queue.length; i > 0; i--) {
    yield function (done) { clientN.ping(done) }
  }
  timeN = Date.now() - timeN

  yield thunk.delay(100)

  timeT = Date.now()
  for (let i = queue.length; i > 0; i--) {
    yield clientT.ping()
  }
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  for (let i = queue.length; i > 0; i--) {
    yield clientI.ping()
  }
  timeI = Date.now() - timeI
  printResult('PING sequential 1 by 1', timeN, timeT, timeI)

  // SET small string
  yield thunk.delay(100)

  timeN = Date.now()
  yield queue.map(function () {
    return function (done) { clientN.set('zensh_thunks_00000001', smallStr, done) }
  })
  timeN = Date.now() - timeN

  yield thunk.delay(100)

  timeT = Date.now()
  yield queue.map(function () {
    return clientT.set('zensh_thunks_00000001', smallStr)
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  yield queue.map(function () {
    return clientI.set('zensh_thunks_00000001', smallStr)
  })
  timeI = Date.now() - timeI
  printResult('SET small string', timeN, timeT, timeI)

  // GET small string
  yield thunk.delay(100)

  timeN = Date.now()
  yield queue.map(function () {
    return function (done) { clientN.get('zensh_thunks_00000001', done) }
  })
  timeN = Date.now() - timeN

  yield thunk.delay(100)

  timeT = Date.now()
  yield queue.map(function () {
    return clientT.get('zensh_thunks_00000001')
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  yield queue.map(function () {
    return clientI.get('zensh_thunks_00000001')
  })
  timeI = Date.now() - timeI
  printResult('GET small string', timeN, timeT, timeI)

  // SET long string
  yield thunk.delay(100)

  timeN = Date.now()
  yield queue.map(function () {
    return function (done) { clientN.set('zensh_thunks_00000002', longStr, done) }
  })
  timeN = Date.now() - timeN

  yield thunk.delay(100)

  timeT = Date.now()
  yield queue.map(function () {
    return clientT.set('zensh_thunks_00000002', longStr)
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  yield queue.map(function () {
    return clientI.set('zensh_thunks_00000002', longStr)
  })
  timeI = Date.now() - timeI
  printResult('SET long string', timeN, timeT, timeI)

  // GET long string
  yield thunk.delay(100)

  timeN = Date.now()
  yield queue.map(function () {
    return function (done) { clientN.get('zensh_thunks_00000002', done) }
  })
  timeN = Date.now() - timeN

  yield thunk.delay(100)

  timeT = Date.now()
  yield queue.map(function () {
    return clientT.get('zensh_thunks_00000002')
  })
  timeT = Date.now() - timeT

  yield thunk.delay(100)

  timeI = Date.now()
  yield queue.map(function () {
    return clientI.get('zensh_thunks_00000002')
  })
  timeI = Date.now() - timeI
  printResult('GET long string', timeN, timeT, timeI)

  // // INCR
  // yield thunk.delay(100)
  //
  // timeN = Date.now()
  // yield queue.map(function () {
  //   return function (done) { clientN.incr('zensh_thunks_00000003', done) }
  // })
  // timeN = Date.now() - timeN
  //
  // yield thunk.delay(100)
  //
  // timeT = Date.now()
  // yield queue.map(function () {
  //   return clientT.incr('zensh_thunks_00000003')
  // })
  // timeT = Date.now() - timeT
  //
  // yield thunk.delay(100)
  //
  // timeI = Date.now()
  // yield queue.map(function () {
  //   return clientI.incr('zensh_thunks_00000003')
  // })
  // timeI = Date.now() - timeI
  // printResult('INCR', timeN, timeT, timeI)
  //
  // // LPUSH
  // yield thunk.delay(100)
  //
  // timeN = Date.now()
  // yield queue.map(function () {
  //   return function (done) { clientN.lpush('zensh_thunks_00000004', smallStr, done) }
  // })
  // timeN = Date.now() - timeN
  //
  // yield thunk.delay(100)
  //
  // timeT = Date.now()
  // yield queue.map(function () {
  //   return clientT.lpush('zensh_thunks_00000004', smallStr)
  // })
  // timeT = Date.now() - timeT
  //
  // yield thunk.delay(100)
  //
  // timeI = Date.now()
  // yield queue.map(function () {
  //   return clientI.lpush('zensh_thunks_00000004', smallStr)
  // })
  // timeI = Date.now() - timeI
  // printResult('LPUSH', timeN, timeT, timeI)
  //
  // // LRANGE
  // yield thunk.delay(100)
  //
  // timeN = Date.now()
  // yield queue.map(function () {
  //   return function (done) { clientN.lrange('zensh_thunks_00000004', '0', '100', done) }
  // })
  // timeN = Date.now() - timeN
  //
  // yield thunk.delay(100)
  //
  // timeT = Date.now()
  // yield queue.map(function () {
  //   return clientT.lrange('zensh_thunks_00000004', '0', '100')
  // })
  // timeT = Date.now() - timeT
  //
  // yield thunk.delay(100)
  //
  // timeI = Date.now()
  // yield queue.map(function () {
  //   return clientI.lrange('zensh_thunks_00000004', '0', '100')
  // })
  // timeI = Date.now() - timeI
  // printResult('LRANGE 100', timeN, timeT, timeI)

  yield thunk.delay(100)
  process.exit()
}
