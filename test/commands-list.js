'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var Thunk = require('thunks')();
var redis = require('../index');

module.exports = function () {
  describe('commands:List', function () {
    var client, client1;

    before(function () {
      client = redis.createClient({database: 0, debugMode: false});
      client.on('error', function (error) {
        console.error('redis client:', error);
      });
      client1 = redis.createClient({database: 0, debugMode: false});
      client1.on('error', function (error) {
        console.error('redis client1:', error);
      });
    });

    beforeEach(function (done) {
      client.flushdb()(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
      })(done);
    });

    after(function () {
      client.clientEnd();
      client1.clientEnd();
    });

    it('client.blpop, client.brpop', function (done) {
      var time = Date.now();
      Thunk.all.call(client, [
        client.blpop('listA', 0),
        Thunk.delay(100)(function () {
          return client1.lpush('listA', 'abc');
        })
      ])(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([['listA', 'abc'], 1]);
        should((Date.now() - time) >= 98).be.equal(true);
        return Thunk.all(this.blpop('listA', 0), client1.lpush('listA', 'abcd'), this.llen('listA'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([['listA', 'abcd'], 1, 0]);
        return Thunk.all(this.lpush('listB', 'b', 'b1'), this.lpush('listC', 'c'), this.blpop('listA', 'listB', 'listC', 0), this.llen('listB'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 1, ['listB', 'b1'], 1]);
        return Thunk.all(this.lpush('listD', 'd', 'd1'), this.lpush('listC', 'c'), this.brpop('listA', 'listD', 'listC', 0), this.llen('listB'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 2, ['listD', 'd'], 1]);
      })(done);
    });

    it('client.brpoplpush, client.rpoplpush', function (done) {
      var time = Date.now();
      Thunk.all.call(client, [
        client.brpoplpush('listA', 'listB', 0),
        Thunk.delay(100)(function () {
          return client1.lpush('listA', 'abc');
        })
      ])(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['abc', 1]);
        should((Date.now() - time) >= 98).be.equal(true);
        return Thunk.all(this.lpush('listB', 'b0', 'b1'), this.rpoplpush('listA', 'listB'), this.llen('listB'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, null, 3]);
        return Thunk.all(this.lpush('listA', 'a0', 'a1'), this.rpoplpush('listA', 'listB'), this.lrange('listB', 0, -1));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 'a0', ['a0', 'b1', 'b0', 'abc']]);
        return Thunk.all(this.rpoplpush('listB', 'listB'), this.lrange('listB', 0, -1));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['abc', ['abc', 'a0', 'b1', 'b0']]);
      })(done);
    });

    it('client.lindex, client.linsert', function (done) {
      client.lindex('listA', 0)(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(null);
        return Thunk.all(this.lpush('listA', 'a0', 'a1'), this.lindex('listA', 0), this.lindex('listA', -1));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 'a1', 'a0']);
        return Thunk.all(this.set('key', 123), this.lindex('key', 0));
      })(function (error, res) {
        should(error).be.instanceOf(Error);
        return this.linsert('key', 'before', 'abc', 'edf');
      })(function (error, res) {
        should(error).be.instanceOf(Error);
        return this.linsert('listB', 'before', 'abc', 'edf');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        return this.linsert('listA', 'before', 'abc', 'edf');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(-1);
        return Thunk.all(this.linsert('listA', 'before', 'a0', 'edf'), this.linsert('listA', 'after', 'a0', 'edf'), this.lrange('listA', 0, -1));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 4, ['a1', 'edf', 'a0', 'edf']]);
      })(done);
    });

    it('client.llen, client.lpop, client.lpush', function (done) {
      client.llen('listA')(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        return Thunk.all(this.set('key', 123), this.llen('key'));
      })(function (error, res) {
        should(error).be.instanceOf(Error);
        return Thunk.all(this.lpush('listA', 'a0', 'a1', 'a2'), this.llen('listA'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 3]);
        return Thunk.all(this.lpop('listA'), this.lpop('listA'), this.lpop('listA'), this.lpop('listA'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['a2', 'a1', 'a0', null]);
      })(done);
    });

    it('client.lpushx, client.lrange, client.lrem', function (done) {
      client.lpushx('listA', 'a')(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        return Thunk.all(this.set('key', 123), this.lpushx('key', 'a'));
      })(function (error, res) {
        should(error).be.instanceOf(Error);
        return Thunk.all(this.lpush('listA', 'a0'), this.lpushx('listA', 'a1'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([1, 2]);
        return Thunk.all(this.lrange('listA', 0, -1), this.lrange('listB', 0, -1));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([['a1', 'a0'], []]);
        return Thunk.all(this.lrem('listA', 0, 'a0'), this.lrem('listB', 0, 'a0'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([1, 0]);
        return Thunk.all(this.lpush('listB', 'b0', 'b1', 'b', 'b1', 'b2'), this.lrem('listB', 0, 'b1'), this.lrange('listB', 0, -1));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([5, 2, ['b2', 'b', 'b0']]);
      })(done);
    });

    it('client.lset, client.ltrim', function (done) {
      client.lset('listA', 0, 'a')(function (error, res) {
        should(error).be.instanceOf(Error);
        return Thunk.all(this.lpush('listA', 'a'), this.lset('listA', 1, 'a'));
      })(function (error, res) {
        should(error).be.instanceOf(Error);
        return Thunk.all(this.lpush('listA', 'b'), this.lset('listA', 1, 'a1'), this.lrange('listA', 0, -1));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 'OK', ['b', 'a1']]);
        return Thunk.all(this.ltrim('listA', 0, 0), this.ltrim('listB', 0, 0), this.lrange('listA', 0, -1));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['OK', 'OK', ['b']]);
        return Thunk.all(this.set('key', 'a'), this.ltrim('key', 0, 0));
      })(function (error, res) {
        should(error).be.instanceOf(Error);
      })(done);
    });

    it('client.rpop, client.rpush, client.rpushx', function (done) {
      client.rpop('listA')(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(null);
        return Thunk.all(this.set('key', 123), this.rpop('key'));
      })(function (error, res) {
        should(error).be.instanceOf(Error);
        return Thunk.all(this.rpush('listA', 'a0', 'a1', 'a2'), this.rpop('listA'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 'a2']);
        return Thunk.all(this.rpushx('listA', 'a3'), this.rpushx('listB', 'a3'));
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 0]);
      })(done);
    });

  });
};
