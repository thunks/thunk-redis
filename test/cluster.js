'use strict'

/*global describe, it, before, after*/

const assert = require('assert')
const thunk = require('thunks')()
const redis = require('..')
const clusterHosts = [
  '120.26.37.146:6379',
  '120.26.37.146:6380',
  '52.73.204.217:6379',
  '52.73.204.217:6380',
  '52.8.203.123:6379'
]
const client = redis.createClient(clusterHosts)
const count = 10000

client.on('error', function (err) {
  console.log(JSON.stringify(err))
})

before(function *() {
  console.log(yield client.cluster('slots'))
})

after(function *() {
  yield thunk.delay(1000)
  process.exit()
})

describe('cluster test', function () {
  it('auto find node by "MOVED" and "ASK"', function *() {
    let clusterHosts2 = clusterHosts.slice()
    clusterHosts2.pop() // drop a node
    let client2 = redis.createClient(clusterHosts2)
    let task = []
    let len = count
    while (len--) {
      task.push(thunk(len + '')(function *(_, res) {
        assert.strictEqual((yield client2.set(res, res)), 'OK')
        assert.strictEqual((yield client2.get(res)), res)
        if (!(res % 500)) process.stdout.write('.')
      }))
    }
    yield thunk.all(task)
  })

  it('create 10000 keys', function *() {
    let task = []
    let len = count
    while (len--) {
      task.push(thunk(len + '')(function *(_, res) {
        assert.strictEqual((yield client.set(res, res)), 'OK')
        assert.strictEqual((yield client.get(res)), res)
        if (!(res % 500)) process.stdout.write('.')
      }))
    }
    yield thunk.all(task)
  })

  it('get 10000 keys', function *() {
    let task = []
    let len = count
    while (len--) {
      task.push(thunk(len + '')(function *(_, res) {
        assert.strictEqual((yield client.get(res)), res)
        if (!(res % 500)) process.stdout.write('.')
      }))
    }
    yield thunk.all(task)
  })

  it.skip('transaction', function *() {
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
      if (!(i % 500)) process.stdout.write('.')
    }
  })

  it('evalauto', function *() {
    let task = []
    let len = count
    while (len--) addTask(len)
    let res = yield thunk.all(task)
    len = count
    while (len--) assert.strictEqual(res[len] + len, count - 1)

    function addTask (index) {
      task.push(function *() {
        let res = yield client.evalauto('return KEYS[1]', 1, index)
        assert.strictEqual(+res, index)
        if (!(index % 500)) process.stdout.write('.')
        return +res
      })
    }
  })

  it.skip('kill a master', function *() {
    let task = []
    let result = {}
    let len = 10000

    client.on('warn', function (err) {
      console.log(err)
    })

    thunk.delay(100)(function () {
      // kill the default master node
      client.debug('segfault')()
    })

    while (len--) {
      task.push(thunk(len + '')(function *(_, res) {
        return yield client.get(res)
      })(function (err, res) {
        assert.strictEqual(err, null)
        result[res] = true
        if (!(res % 500)) process.stdout.write('.')
      }))
      yield thunk.delay(5)
    }
    yield thunk.all(task)
    len = 10000
    while (len--) assert.strictEqual(result[len], true)
  })
})
