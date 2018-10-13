'use strict'

const tman = require('tman')
const should = require('should')
const thunk = require('thunks')()
const redis = require('../..')

tman.suite('commands:Server', function () {
  let client1, client2, client3, client4

  tman.beforeEach(function (done) {
    client1 = redis.createClient()
    client1.on('error', function (error) {
      console.error('redis client:', error)
    })

    client2 = redis.createClient()
    client2.on('error', function (error) {
      console.error('redis client:', error)
    })

    client3 = redis.createClient()
    client3.on('error', function (error) {
      console.error('redis client:', error)
    })

    client1.flushall()(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
    })(done)
  })

  tman.afterEach(function () {
    client1.clientEnd()
    client2.clientEnd()
    client3.clientEnd()
  })

  tman.it('client.monitor', function (done) {
    client2.monitor()(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
    })(done)
  })

  tman.it('client.bgrewriteaof, client.bgsave, client.lastsave', function (done) {
    client1.bgrewriteaof()(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('Background append only file rewriting started')
      return thunk.delay.call(this, 200)(function () {
        return this.bgsave()
      })
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('Background saving started')
      return thunk.delay.call(this, 200)(function () {
        return this.lastsave()
      })
    })(function (error, res) {
      should(error).be.equal(null)
      should((Date.now() / 1000 - res) < 10).be.equal(true)
    })(done)
  })

  tman.it('client.client', function (done) {
    client1.client('getname')(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(null)
      return thunk.all(this.client('setname', 'test-redis'), this.client('getname'))
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['OK', 'test-redis'])
      return thunk.all(this.client('setname', ''), this.client('getname'))
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['OK', null])
      client4 = redis.createClient()
      return client4.info()
    })(function (error, res) {
      should(error).be.equal(null)
      return this.client('list')
    })(function (error, res) {
      const list = res.trim().spltman.it('\n')
      should(error).be.equal(null)
      should(list.length > 3).be.equal(true)
      const addr4 = list[list.length - 1].replace(/(^.*addr=)|( fd=.*$)/g, '')
      return this.client('kill', addr4)
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
      return this.client('kill', '127.0.0.1:80')
    })(function (error, res) {
      should(error).be.instanceOf(Error)
    })(done)
  })

  tman.it('client.config', function (done) {
    client1.config('get', '*')(function (error, res) {
      should(error).be.equal(null)
      should(res.length > 10).be.equal(true)
      return thunk.all(this.config('set', 'slowlog-max-len', 10086), this.config('get', 'slowlog-max-len'))
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['OK', ['slowlog-max-len', '10086']])
      return this.config('resetstat')
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal('OK')
    // return this.config('rewrite')
    })(done)
  })

  tman.it('client.debug', function (done) {
    client1.debug('object', 'key')(function (error, res) {
      should(error).be.instanceOf(Error)
      return thunk.all(this.set('key', 100), this.debug('object', 'key'))
    })(function (error, res) {
      should(error).be.equal(null)
      should(res[0]).be.equal('OK')
      should(res[1].indexOf('encoding:int') > 0).be.equal(true)
    // this.debug('object', 'SEGFAULT')
    })(done)
  })

  tman.it('client.dbsize, client.flushall, client.flushdb', function (done) {
    client1.dbsize()(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(0)
      return thunk.all(this.set('key1', 100), this.set('key2', 100), this.dbsize())
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['OK', 'OK', 2])
      return thunk.all(this.select(1), this.set('key', 100), this.dbsize())
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['OK', 'OK', 1])
      return thunk.all(this.flushall(), this.dbsize(), this.select(0), this.dbsize())
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.eql(['OK', 0, 'OK', 0])
    })(done)
  })

  tman.it('client.time, client.info, client.slowlog', function (done) {
    client1.time()(function (error, res) {
      should(error).be.equal(null)
      should(res.length).be.equal(2)
      return this.info()
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.properties('redis_version', 'os', 'process_id', 'used_memory', 'connected_clients')
      return thunk.all(this.slowlog('len'), this.slowlog('get'))
    })(function (error, res) {
      should(error).be.equal(null)
      should(res[0] >= res[1].length).be.equal(true)
    })(done)
  })

  tman.it('client.command', function (done) {
    let len = 0
    client1.command()(function (error, commands) {
      should(error).be.equal(null)
      len = commands.length
      return thunk.all.call(this, commands.map(function (command) {
        return client1.command('info', command[0])(function (error, res) {
          should(error).be.equal(null)
          should(res[0]).be.eql(command)
          return command[0]
        })
      }))(function (error, res) {
        should(error).be.equal(null)
        should(res.length).be.equal(len)
        res.unshift('info')
        return this.command(res)
      })(function (error, res) {
        should(error).be.equal(null)
        should(res).be.eql(commands)
        return this.command('count')
      })
    })(function (error, res) {
      should(error).be.equal(null)
      should(res).be.equal(len)
    })(done)
  })

  tman.it.skip('client.psync, client.sync, client.save, client.shutdown, client.slaveof', function (done) {})
})
