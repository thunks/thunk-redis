'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var thunks = require('thunks');
var JSONKit = require('jsonkit');
var redis = require('../index');

module.exports = function() {
  describe('commands:Hash', function() {
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

    it('client.hdel, client.hexists', function(done) {
      var Thunk = thunks(function(error) {
        console.error(error);
        done(error);
      });

      Thunk.call(client, client.hdel('hash', 'key'))(function(error, res) {
        should(res).be.equal(0);
        return this.hexists('hash', 'key');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.hset('hash', 'key', 123);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.hexists('hash', 'key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.hdel('hash', 'key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.hmset('hash', {
          key1: 1,
          key2: 2
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.hdel('hash', 'key1', 'key2', 'key3');
      })(function(error, res) {
        should(res).be.equal(2);
      })(done);
    });

    it('client.hget, client.hgetall, client.hkeys', function(done) {
      var Thunk = thunks(function(error) {
        console.error(error);
        done(error);
      });

      Thunk.call(client, client.hget('hash', 'key'))(function(error, res) {
        should(res).be.equal(null);
        return this.hgetall('hash');
      })(function(error, res) {
        should(res).be.eql({});
        return this.hkeys('hash');
      })(function(error, res) {
        should(res).be.eql([]);
        return this.hmset('hash', {
          key1: 1,
          key2: 2,
          key3: 3
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.hget('hash', 'key3');
      })(function(error, res) {
        should(res).be.equal('3');
        return this.hgetall('hash');
      })(function(error, res) {
        should(res).be.eql({
          key1: '1',
          key2: '2',
          key3: '3'
        });
        return this.hkeys('hash');
      })(function(error, res) {
        should(res).be.eql(['key1', 'key2', 'key3']);
      })(done);
    });

    it('client.hincrby, client.hincrbyfloat', function(done) {
      var Thunk0 = thunks();
      var Thunk = thunks(function(error) {
        console.error(error);
        done(error);
      });

      Thunk.call(client, client.hincrby('hash', 'key', -1))(function(error, res) {
        should(res).be.equal(-1);
        return this.hincrby('hash', 'key', -9);
      })(function(error, res) {
        should(res).be.equal(-10);
        return this.hincrby('hash', 'key', 15);
      })(function(error, res) {
        should(res).be.equal(5);
        return this.hincrbyfloat('hash', 'key', -1.5);
      })(function(error, res) {
        should(res).be.equal('3.5');
        return this.hset('hash', 'key1', 'hello');
      })(function(error, res) {
        should(res).be.equal(1);
        return Thunk0.call(this, this.hincrbyfloat('hash', 'key1', 1))(function(error, res) {
          should(error).be.instanceOf(Error);
        });
      })(done);
    });

    it('client.hlen, client.hmget, client.hmset', function(done) {
      var Thunk0 = thunks();
      var Thunk = thunks(function(error) {
        console.error(error);
        done(error);
      });

      Thunk.call(client, client.hlen('hash'))(function(error, res) {
        should(res).be.equal(0);
        return this.hmget('hash', 'key1', 'key2');
      })(function(error, res) {
        should(res).be.eql([null, null]);
        return this.hmset('hash', {
          key1: 1,
          key2: 2,
          key3: 3
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.hmget('hash', 'key3', 'key', 'key1');
      })(function(error, res) {
        should(res).be.eql(['3', null, '1']);
        return this.hmset('hash', 'key', 0, 'key3', 'hello');
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.hlen('hash');
      })(function(error, res) {
        should(res).be.equal(4);
        return this.hmget('hash', 'key3', 'key');
      })(function(error, res) {
        should(res).be.eql(['hello', '0']);
        return this.set('key', 'hello');
      })(function(error, res) {
        should(res).be.equal('OK');
        return Thunk0.call(this, this.hlen('key'))(function(error, res) {
          should(res).be.equal(0);
          return this.hmget('key', 'key3');
        })(function(error, res) {
          should(res).be.eql([null]);
          return this.hmset('key', 'key3', 'hello');
        })(function(error, res) {
          should(error).be.instanceOf(Error);
        });
      })(done);
    });

    it('client.hset, client.hsetnx, client.hvals', function(done) {
      var Thunk0 = thunks();
      var Thunk = thunks(function(error) {
        console.error(error);
        done(error);
      });

      Thunk.call(client, client.hvals('hash'))(function(error, res) {
        should(res).be.eql([]);
        return this.hset('hash', 'key', 123);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.hset('hash', 'key', 456);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.hget('hash', 'key');
      })(function(error, res) {
        should(res).be.equal('456');
        return this.hsetnx('hash', 'key', 0);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.hget('hash', 'key');
      })(function(error, res) {
        should(res).be.equal('456');
        return this.hsetnx('hash', 'key1', 'hello');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.hsetnx('hash1', 'key1', 'hello');
      })(function(error, res) {
        should(res).be.equal(1);
        return this, this.hget('hash', 'key1');
      })(function(error, res) {
        should(res).be.equal('hello');
        return this, this.hget('hash1', 'key1');
      })(function(error, res) {
        should(res).be.equal('hello');
        return this, this.hvals('hash1');
      })(function(error, res) {
        should(res).be.eql(['hello']);
      })(done);
    });

    it('client.hscan', function(done) {
      var Thunk = thunks(function(error) {
        console.error(error);
        done(error);
      });
      var count = 100,
        data = {},
        scanKeys = [];

      while (count--) data['key' + count] = count;

      function fullScan(key, cursor) {
        return client.hscan(key, cursor)(function(error, res) {
          scanKeys = scanKeys.concat(res[1]);
          if (res[0] === '0') return res;
          return fullScan(key, res[0]);
        });
      }

      Thunk.call(client, client.hscan('hash', 0))(function(error, res) {
        should(res).be.eql(['0', []]);
        return client.hmset('hash', data);
      })(function(error, res) {
        should(res).be.equal('OK');
        return fullScan('hash', 0);
      })(function(error, res) {
        should(scanKeys.length).be.equal(200);
        JSONKit.each(data, function(value, key) {
          should(scanKeys).be.containEql(value + '');
          should(scanKeys).be.containEql(key);
        });
        return this.hscan('hash', '0', 'count', 20);
      })(function(error, res) {
        should(res[0] >= 0).be.equal(true);
        should(Object.keys(res[1]).length > 0).be.equal(true);
        return this.hscan('hash', '0', 'count', 200, 'match', '*0');
      })(function(error, res) {
        should(res[0] === '0').be.equal(true);
        should(Object.keys(res[1]).length === 20).be.equal(true);
      })(done);
    });

  });
};
