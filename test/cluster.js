'use strict'

/* global describe, it, before, after */

const assert = require('assert')
const thunk = require('thunks')()
const redis = require('..')
// Server: https://github.com/Grokzen/docker-redis-cluster
const clusterHosts = [
  '127.0.0.1:7000',
  '127.0.0.1:7001',
  '127.0.0.1:7002',
  '127.0.0.1:7003',
  '127.0.0.1:7004',
  '127.0.0.1:7005',
  '127.0.0.1:7006',
  '127.0.0.1:7007'
]
const options = {
  IPMap: {
    '172.17.0.2:7000': '127.0.0.1:7000',
    '172.17.0.2:7001': '127.0.0.1:7001',
    '172.17.0.2:7002': '127.0.0.1:7002',
    '172.17.0.2:7003': '127.0.0.1:7003',
    '172.17.0.2:7004': '127.0.0.1:7004',
    '172.17.0.2:7005': '127.0.0.1:7005',
    '172.17.0.2:7006': '127.0.0.1:7006',
    '172.17.0.2:7007': '127.0.0.1:7007'
  }
}

const client = redis.createClient(clusterHosts, options)
const count = 10000

client.on('error', function (err) {
  console.log(JSON.stringify(err))
})

before(function * () {
  console.log(yield client.cluster('slots'))
})

after(function * () {
  yield thunk.delay(1000)
  process.exit()
})

describe('cluster test', function () {
  it('auto find node by "MOVED" and "ASK"', function * () {
    let clusterHosts2 = clusterHosts.slice()
    clusterHosts2.pop() // drop a node
    let client2 = redis.createClient(clusterHosts2, options)
    let task = []
    let len = count
    while (len--) {
      task.push(thunk(len + '')(function * (_, res) {
        assert.strictEqual((yield client2.set(res, res)), 'OK')
        assert.strictEqual((yield client2.get(res)), res)
        if (!(res % 500)) process.stdout.write('.')
      }))
    }
    yield thunk.all(task)
  })

  it('create 10000 keys', function * () {
    let task = []
    let len = count
    while (len--) {
      task.push(thunk(len + '')(function * (_, res) {
        assert.strictEqual((yield client.set(res, res)), 'OK')
        assert.strictEqual((yield client.get(res)), res)
        if (!(res % 500)) process.stdout.write('.')
      }))
    }
    yield thunk.all(task)
  })

  it('get 10000 keys', function * () {
    let task = []
    let len = count
    while (len--) {
      task.push(thunk(len + '')(function * (_, res) {
        assert.strictEqual((yield client.get(res)), res)
        if (!(res % 500)) process.stdout.write('.')
      }))
    }
    yield thunk.all(task)
  })

  it.skip('transaction', function * () {
    for (let i = 0; i < count; i++) {
      let res = yield [
        client.multi(),
        client.set(i, i),
        client.get(i),
        client.exec()
      ]
      console.log(111, res)
      assert.strictEqual(res[0], 'OK')
      assert.strictEqual(res[1], 'QUEUED')
      assert.strictEqual(res[2], 'QUEUED')
      assert.strictEqual(res[3][0], 'OK')
      assert.strictEqual(res[3][1], i + '')
      if (!(i % 500)) process.stdout.write('.')
    }
  })

  it.skip('evalauto', function * () {
    let task = []
    let len = count
    while (len--) addTask(len)
    yield thunk.all(task)

    function addTask (index) {
      task.push(function * () {
        let res = yield client.evalauto('return KEYS[1]', 1, index)
        assert.strictEqual(+res, index)
        if (!(index % 500)) process.stdout.write('.')
        return +res
      })
    }
  })

  it.skip('kill a master', function * () {
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
      task.push(thunk(len + '')(function * (_, res) {
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
