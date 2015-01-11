'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var Thunk = require('thunks')();
var redis = require('../index');

module.exports = function() {
  describe('commands:String', function() {
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

    it('client.append', function(done) {
      client.append('key', 123)(function(error, res) {
        should(res).be.equal(3);
        return this.append('key', 456);
      })(function(error, res) {
        should(res).be.equal(6);
        return this.get('key');
      })(function(error, res) {
        should(res).be.equal('123456');
      })(done);
    });

    it('client.bitcount, client.getbit, client.setbit', function(done) {
      client.getbit('key', 9)(function(error, res) {
        should(res).be.equal(0);
        return this.setbit('key', 9, 1);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.getbit('key', 9);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.setbit('key', 9, 0);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.bitcount('key', 1, 2);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.del('key');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.bitcount('key');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.setbit('key', 0, 1);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.setbit('key', 3, 1);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.bitcount('key');
      })(function(error, res) {
        should(res).be.equal(2);
        return this.bitcount('key', 1, 2);
      })(function(error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.bitop', function(done) {
      client.bitop('or', 'key', 'key1', 'key2', 'key3')(function(error, res) {
        should(res).be.equal(0);
        return this.setbit('key1', 0, 1);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.setbit('key2', 1, 1);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.setbit('key3', 2, 1);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.bitop('or', 'key', 'key1', 'key2', 'key3');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.getbit('key', 2);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.bitop('and', 'key', 'key1', 'key2', 'key3');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.bitop('xor', 'key', 'key1', 'key2', 'key3');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.bitop('not', 'key', 'key1');
      })(function(error, res) {
        should(res).be.equal(1);
      })(done);
    });

    it('client.bitpos', function(done) {
      client.set('key', '\xff\xf0\x00')(function(error, res) {
        should(res).be.equal('OK');
        return this.bitpos('key', 0);
      })(function(error, res) {
        should(res).be.equal(2);
        return this.set('key2', '\x00\xff\xf0');
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.bitpos('key2', 1, 0);
      })(function(error, res) {
        should(res).be.equal(8);
        return this.bitpos('key2', 1, 2);
      })(function(error, res) {
        should(res).be.equal(16);
        return this.set('key3', '\x00\x00\x00');
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.bitpos('key3', 1);
      })(function(error, res) {
        should(res).be.equal(-1);
      })(done);
    });

    it('client.decr, client.decrby, client.incr, client.incrby, client.incrbyfloat', function(done) {
      client.decr('key')(function(error, res) {
        should(res).be.equal(-1);
        return this.decrby('key', 9);
      })(function(error, res) {
        should(res).be.equal(-10);
        return this.incr('key');
      })(function(error, res) {
        should(res).be.equal(-9);
        return this.incrby('key', 10);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.incrbyfloat('key', 1.1);
      })(function(error, res) {
        should(res).be.equal('2.1');
        return this.incr('key')(function(error, res) {
          should(error).be.instanceOf(Error);
        });
      })(done);
    });

    it('client.get, client.set', function(done) {
      client.get('key')(function(error, res) {
        should(res).be.equal(null);
        return this.lpush('key', 'hello');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.get('key')(function(error, res) {
          should(error).be.instanceOf(Error);
          return this.set('key', 'hello');
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.get('key');
      })(function(error, res) {
        should(res).be.equal('hello');
        return this.set('key', 123, 'nx');
      })(function(error, res) {
        should(res).be.equal(null);
        return this.set('key1', 123, 'xx');
      })(function(error, res) {
        should(res).be.equal(null);
        return this.set('key1', 123, 'nx', 'ex', 1);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.set('key1', 456, 'xx', 'px', 1100);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.pttl('key1');
      })(function(error, res) {
        should(res > 1000).be.equal(true);
      })(done);
    });

    it('client.getset, client.getrange', function(done) {
      client.getset('key', 'hello')(function(error, res) {
        should(res).be.equal(null);
        return this.getrange('key', 0, -2);
      })(function(error, res) {
        should(res).be.equal('hell');
        return this.getset('key', 'world');
      })(function(error, res) {
        should(res).be.equal('hello');
        return this.getrange('key', 1, 2);
      })(function(error, res) {
        should(res).be.equal('or');
        return this.lpush('key1', 'hello');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.getset('key1', 'world')(function(error, res) {
          should(error).be.instanceOf(Error);
          return this.getrange('key1', 0, 10086);
        })(function(error, res) {
          should(error).be.instanceOf(Error);
        });
      })(done);
    });

    it('client.mget, client.mset, client.msetnx', function(done) {
      client.mget('key1', 'key2')(function(error, res) {
        should(res).be.eql([null, null]);
        return this.mset('key1', 1, 'key2', 2);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.mget('key1', 'key3', 'key2');
      })(function(error, res) {
        should(res).be.eql(['1', null, '2']);
        return this.mset({
          key1: 0,
          key3: 3
        });
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.mget('key1', 'key3', 'key2');
      })(function(error, res) {
        should(res).be.eql(['0', '3', '2']);
        return this.msetnx('key3', 1, 'key4', 4);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.exists('key4');
      })(function(error, res) {
        should(res).be.equal(0);
        return this.msetnx('key4', 4, 'key5', 5);
      })(function(error, res) {
        should(res).be.equal(1);
        return this.msetnx({
          key6: 6,
          key: 0
        });
      })(function(error, res) {
        should(res).be.equal(1);
        return this.mget('key', 'key5', 'key6');
      })(function(error, res) {
        should(res).be.eql(['0', '5', '6']);
      })(done);
    });

    it('client.psetex, client.setex, client.setnx, client.setrange, client.strlen', function(done) {
      client.strlen('key')(function(error, res) {
        should(res).be.equal(0);
        return this.lpush('key', 'hello');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.strlen('key')(function(error, res) {
          should(error).be.instanceOf(Error);
          return this.setnx('key', 'hello');
        });
      })(function(error, res) {
        should(res).be.equal(0);
        return this.setnx('key1', 'hello');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.setnx('key1', 123);
      })(function(error, res) {
        should(res).be.equal(0);
        return this.setex('key1', 1, 456);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.psetex('key1', 1100, 789);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.pttl('key1');
      })(function(error, res) {
        should(res > 1000).be.equal(true);
        return this.get('key1');
      })(function(error, res) {
        should(res).be.equal('789');
        return this.setrange('key1', 3, '012');
      })(function(error, res) {
        should(res).be.equal(6);
        return this.get('key1');
      })(function(error, res) {
        should(res).be.equal('789012');
        return this.setrange('key2', 10, 'hello');
      })(function(error, res) {
        should(res).be.equal(15);
        return this.get('key2');
      })(function(error, res) {
        should(res).be.endWith('hello');
      })(done);
    });
  });
};
