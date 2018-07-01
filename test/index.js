'use strict'

const tman = require('tman')
const should = require('should')
const redis = require('..')

tman.before(function * () {
  const cli = redis.createClient({
    database: 0
  })
  let res = yield cli.flushall()
  should(res).be.equal('OK')

  res = yield cli.dbsize()
  should(res).be.equal(0)

  res = yield cli.select(1)
  should(res).be.equal('OK')

  res = yield cli.flushdb()
  should(res).be.equal('OK')

  res = yield cli.dbsize()
  should(res).be.equal(0)

  yield cli.clientEnd()
})

tman.after(function * () {
  yield (done) => setTimeout(done, 1000)
  process.exit()
})
