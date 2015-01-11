'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var Thunk = require('thunks')();
var JSONKit = require('jsonkit');
var redis = require('../index');

module.exports = function() {
  describe('commands:Key', function() {
    var client;

    before(function() {
      client = redis.createClient({
        database: 0
      });
      client.on('error', function(error) {
        console.error('redis client:', error);
      });
    });

    beforeEach(function(done) {
      client.flushdb()(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
      })(done);
    });

    after(function() {
      client.clientEnd();
    });

    it('client.del, client.exists', function(done) {
      client.mset({
        key: 1,
        key1: 2,
        key2: 3,
        key3: 4
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.exists('key1');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.exists('key2');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.exists('key3');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.del('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.del(['key1', 'key2', 'key3']);
      })(function(error, res) {
        should(res).be.equal(3);
        return this.exists('key1');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.exists('key2');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.exists('key3');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.del('key');
      })(function(error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.dump, client.restore', function(done) {
      var serializedValue;
      var client2 = redis.createClient({
        returnBuffers: true,
        debugMode: false
      });

      client2.dump('dumpKey')(function(error, res) {
        should(res).be.equal(null);
        return this.set('dumpKey', 'hello, dump & restore!');
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.dump('dumpKey');
      })(function(error, res) {
        should(Buffer.isBuffer(res)).be.equal(true);
        serializedValue = res;
        return this.restore('restoreKey', 0, 'errorValue')(function(error, res) {
          should(error).be.instanceOf(Error);
          should(res).be.equal(undefined);
          return this.restore('restoreKey', 0, serializedValue);
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.get('restoreKey');
      })(function(error, res) {
        should(Buffer.isBuffer(res)).be.equal(true);
        should(res.toString('utf8')).be.equal('hello, dump & restore!');
        return this.restore('restoreKey', 0, serializedValue)(function(error, res) {
          should(error).be.instanceOf(Error);
          should(res).be.equal(undefined);
          return this.get('restoreKey');
        });
      })(function(error, res) {
        should(Buffer.isBuffer(res)).be.equal(true);
        should(res.toString('utf8')).be.equal('hello, dump & restore!');
        return this.restore('key123', 1000, serializedValue);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.get('key123');
      })(function(error, res) {
        should(Buffer.isBuffer(res)).be.equal(true);
        should(res.toString('utf8')).be.equal('hello, dump & restore!');
        return Thunk.delay(1100);
      })(function(error, res) {
        return this.exists('key123');
      })(function(error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.expire', function(done) {
      client.set('key', 123)(function(error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.expire('key', 1);
      })(function(error, res) {
        should(res).be.equal(1);
        return Thunk.delay.call(this, 1010)(function() {
          return this.exists('key');
        });
      })(function(error, res) {
        should(res).be.equal(0);
        return this.expire('key', 1);
      })(function(error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.expireat', function(done) {
      client.set('key', 123)(function(error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.expireat('key', Math.floor(Date.now() / 1000 + 1));
      })(function(error, res) {
        should(res).be.equal(1);
        return Thunk.delay.call(this, 1001)(function() {
          return this.exists('key');
        });
      })(function(error, res) {
        should(res).be.equal(0);
        return this.expireat('key', Math.floor(Date.now() / 1000 + 1));
      })(function(error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.keys', function(done) {
      client.keys('*')(function(error, res) {
        should(res).be.eql([]);
        return this.mset({
          a: 123,
          a1: 123,
          b: 123,
          b1: 123,
          c: 123,
          c1: 123
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.keys('*');
      })(function(error, res) {
        should(res.sort()).be.eql(['a', 'a1', 'b', 'b1', 'c', 'c1']);
        return this.keys('a*');
      })(function(error, res) {
        should(res.sort()).be.eql(['a', 'a1']);
        return this.keys('?1');
      })(function(error, res) {
        should(res.sort()).be.eql(['a1', 'b1', 'c1']);
      })(done);
    });

    it('client.move', function(done) {
      client.mset({
        key1: 1,
        key2: 2
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.select(1);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.mset({
          key2: 4,
          key3: 6
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.move('key2', 0);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.get('key2');
      })(function(error, res) {
        should(res).be.equal('4');
        return this.move('key3', 0);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.exists('key3');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.move('key4', 0);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.select(0);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.get('key3');
      })(function(error, res) {
        should(res).be.equal('6');
        return this.get('key2');
      })(function(error, res) {
        should(res).be.equal('2');
        return this.move('key2', 0)(function(error, res) {
          should(error).be.instanceOf(Error);
        });
      })(done);
    });

    it('client.object', function(done) {
      client.mset({
        key1: 123,
        key2: 'hello'
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.object('refcount', 'key1');
      })(function(error, res) {
        should(res >= 1).be.equal(true);
        return this.object('encoding', 'key1');
      })(function(error, res) {
        should(res).be.equal('int');
        return this.object('encoding', 'key2');
      })(function(error, res) {
        should(res).be.equal('raw');
        return Thunk.delay(1001);
      })(function(error, res) {
        return this.object('idletime', 'key1');
      })(function(error, res) {
        should(res >= 1).be.equal(true);
      })(done);
    });

    it('client.persist', function(done) {
      client.set('key', 'hello')(function(error, res) {
        should(res).be.equal('OK');
        return this.expire('key', 1);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.persist('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.persist('key');
      })(function(error, res) {
        should(res).be.equal(0);
        return Thunk.delay(1001);
      })(function(error, res) {
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.persist('key123');
      })(function(error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.pexpire', function(done) {
      client.set('key', 123)(function(error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.pexpire('key', 100);
      })(function(error, res) {
        should(res).be.equal(1);
        return Thunk.delay.call(this, 101)(function() {
          return this.exists('key');
        });
      })(function(error, res) {
        should(res).be.equal(0);
        return this.pexpire('key', 100);
      })(function(error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.pexpireat', function(done) {
      client.set('key', 123)(function(error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.pexpireat('key', Date.now() + 100);
      })(function(error, res) {
        should(res).be.equal(1);
        return Thunk.delay.call(this, 101)(function() {
          return this.exists('key');
        });
      })(function(error, res) {
        should(res).be.equal(0);
        return this.pexpireat('key', Date.now() + 100);
      })(function(error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.pttl, client.ttl', function(done) {
      client.set('key', 'hello')(function(error, res) {
        should(res).be.equal('OK');
        return this.pttl('key');
      })(function(error, res) {
        should(res).be.equal(-1);
        return this.pttl('key123');
      })(function(error, res) {
        should(res).be.equal(-2);
        return this.ttl('key');
      })(function(error, res) {
        should(res).be.equal(-1);
        return this.ttl('key123');
      })(function(error, res) {
        should(res).be.equal(-2);
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.pexpire('key', 1200);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.ttl('key');
      })(function(error, res) {
        should(res >= 1).be.equal(true);
        return this.pttl('key');
      })(function(error, res) {
        should(res >= 1000).be.equal(true);
      })(done);
    });

    it('client.randomkey', function(done) {
      client.randomkey()(function(error, res) {
        should(res).be.equal(null);
        return this.set('key', 'hello');
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.randomkey();
      })(function(error, res) {
        should(res).be.equal('key');
      })(done);
    });

    it('client.rename, client.renamenx', function(done) {
      client.mset({
        key: 'hello',
        newkey: 1
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.rename('key', 'newkey');
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.get('newkey');
      })(function(error, res) {
        should(res).be.equal('hello');
        return this.rename('key', 'key1')(function(error, res) {
          should(error).be.instanceOf(Error);
          return this.rename('newkey', 'newkey');
        })(function(error, res) {
          should(error).be.instanceOf(Error);
          return this.renamenx('key', 'newkey');
        })(function(error, res) {
          should(error).be.instanceOf(Error);
          return this.set('key', 1);
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.renamenx('newkey', 'key');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.renamenx('newkey', 'key1');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.get('key1');
      })(function(error, res) {
        should(res).be.equal('hello');
        return this.exists('newkey');
      })(function(error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.sort', function(done) {
      client.sort('key')(function(error, res) {
        should(res).be.eql([]);
        return this.set('key', 12345);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.sort('key')(function(error, res) {
          should(error).be.instanceOf(Error);
          return this.lpush('list', 1, 3, 5, 4, 2);
        });
      })(function(error, res) {
        should(res).be.equal(5);
        return this.sort('list');
      })(function(error, res) {
        should(res).be.eql(['1', '2', '3', '4', '5']);
        return this.sort('list', 'desc');
      })(function(error, res) {
        should(res).be.eql(['5', '4', '3', '2', '1']);
        return this.lpush('list1', 'a', 'b', 'ac');
      })(function(error, res) {
        should(res).be.equal(3);
        return this.sort('list1', 'desc', 'alpha');
      })(function(error, res) {
        should(res).be.eql(['b', 'ac', 'a']);
        return this.sort('list', 'desc', 'limit', '1', '3');
      })(function(error, res) {
        should(res).be.eql(['4', '3', '2']);
        return this.mset({
          user1: 80,
          user2: 100,
          user3: 90,
          user4: 70,
          user5: 95,
          user1name: 'zhang',
          user2name: 'li',
          user3name: 'wang',
          user4name: 'liu',
          user5name: 'yan'
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.sort('list', 'by', 'user*', 'get', 'user*name', 'desc');
      })(function(error, res) {
        should(res).be.eql(['li', 'yan', 'wang', 'zhang', 'liu']);
        return this.sort('list', 'by', 'user*', 'get', 'user*name', 'store', 'sorteduser');
      })(function(error, res) {
        should(res).be.equal(5);
        return this.lrange('sorteduser', 0, -1);
      })(function(error, res) {
        should(res).be.eql(['liu', 'zhang', 'wang', 'yan', 'li']);
      })(done);
    });

    it('client.type', function(done) {
      client.mset({
        a: 123,
        b: '123'
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.type('key');
      })(function(error, res) {
        should(res).be.equal('none');
        return this.type('a');
      })(function(error, res) {
        should(res).be.equal('string');
        return this.type('b');
      })(function(error, res) {
        should(res).be.equal('string');
        return this.lpush('list', '123');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.type('list');
      })(function(error, res) {
        should(res).be.equal('list');
      })(done);
    });

    it('client.scan', function(done) {
      var count = 100,
        data = {},
        scanKeys = [];

      while (count--) data['key' + count] = count;

      function fullScan(cursor) {
        return client.scan(cursor)(function(error, res) {
          scanKeys = scanKeys.concat(res[1]);
          if (res[0] === '0') return res;
          return fullScan(res[0]);
        });
      }

      client.scan(0)(function(error, res) {
        should(res).be.eql(['0', []]);
        return this.mset(data);
      })(function(error, res) {
        should(res).be.equal('OK');
        return fullScan(0);
      })(function(error, res) {
        JSONKit.each(data, function(value, key) {
          should(scanKeys.indexOf(key) >= 0).be.equal(true);
        });
        return this.scan('0', 'count', 20);
      })(function(error, res) {
        should(res[0] > 0).be.equal(true);
        should(res[1].length > 0).be.equal(true);
        return this.scan('0', 'count', 200, 'match', '*0');
      })(function(error, res) {
        should(res[0] === '0').be.equal(true);
        should(res[1].length === 10).be.equal(true);
      })(done);
    });

  });
};
