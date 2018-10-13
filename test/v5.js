'use strict'

const { suite, it, before, beforeEach, after } = require('tman')
const { strictEqual, deepEqual } = require('assert')
const redis = require('..')

suite('redis v5', function () {
  // TODO: add tests
  // 'xread', 'xpending', 'georadius_ro', 'xlen', 'xreadgroup', 'xadd', 'xinfo', 'xclaim',
  // 'bzpopmin', 'xrange', 'zpopmax', 'zpopmin', 'xgroup', 'xack', 'xtrim', 'bzpopmax',
  // 'xrevrange', 'georadiusbymember_ro', 'xdel'
  let cli

  before(function () {
    cli = redis.createClient({
      database: 0
    })
    cli.on('error', function (error) {
      console.error('redis client:', error)
    })
  })

  beforeEach(function * () {
    yield cli.flushdb()
  })

  after(function () {
    cli.clientEnd()
  })

  suite('stream', function () {
    it('should work', function * () {
      const id1 = yield cli.xadd('mystream', '*', 'name', 'Sara', 'surname', 'OConnor')
      const id2 = yield cli.xadd('mystream', '*', 'field1', 'value1', 'field2', 'value2', 'field3', 'value3')

      const len = yield cli.xlen('mystream')
      strictEqual(len, 2)

      const res = yield cli.xrange('mystream', '-', '+')
      strictEqual(res.length, 2)
      strictEqual(res[0][0], id1)
      deepEqual(res[0][1], ['name', 'Sara', 'surname', 'OConnor'])

      strictEqual(res[1][0], id2)
      deepEqual(res[1][1], ['field1', 'value1', 'field2', 'value2', 'field3', 'value3'])
    })
  })
})
