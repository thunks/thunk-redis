'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var thunks = require('thunks');
var JSONKit = require('jsonkit');
var redis = require('../index');

module.exports = function() {
  describe('commands:Sorted Set', function() {
    var client;

    before(function() {
      client = redis.createClient({
        database: 0,
        debugMode: false
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

    it('client.zadd, client.zcard, client.zcount', function(done) {
      var Thunk = thunks();

      Thunk.call(client, client.zcard('zsetA'))(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        return Thunk.all(this.set('key', 'abc'), this.zcard('key'));
      })(function(error, res) {
        should(error).be.instanceOf(Error);
        return this.zadd('key', 0, 'a');
      })(function(error, res) {
        should(error).be.instanceOf(Error);
        return Thunk.all(this.zadd('zsetA', 0, 'a', 1, 'b'), this.zadd('zsetA', 2, 'b', 3, 'c'), this.zcard('zsetA'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 1, 3]);
        return this.zcount('zsetA', 2, 3);
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(2);
      })(done);
    });

    it('client.zincrby, client.zscore, client.zrange, client.zrangebyscore', function(done) {
      var Thunk = thunks();

      Thunk.call(client, client.zadd('zsetA', 2, 'a'))(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(1);
        return Thunk.all(this.zincrby('zsetA', 10, 'a'), this.zscore('zsetA', 'a'));
      })(function(error, res) {
        should(res).be.eql(['12', '12']);
        return Thunk.all(this.zincrby('zsetA', 10, 'b'), this.zincrby('zsetA', -2, 'a'), this.zscore('zsetA', 'b'));
      })(function(error, res) {
        should(res).be.eql(['10', '10', '10']);
        return this.zrange('zsetA', 0, -1);
      })(function(error, res) {
        should(res).be.eql(['a', 'b']);
        return Thunk.all(this.zincrby('zsetA', 15, 'c'), this.zincrby('zsetA', 10, 'b'), this.zrange('zsetA', 1, -1, 'WITHSCORES'));
      })(function(error, res) {
        should(res).be.eql(['15', '20', ['c', '15', 'b', '20']]);
        return this.zrangebyscore('zsetA', '(10', 100, 'WITHSCORES');
      })(function(error, res) {
        should(res).be.eql(['c', '15', 'b', '20']);
        return this.zrangebyscore('zsetA', '-inf', '+inf', 'LIMIT', 1, 1);
      })(function(error, res) {
        should(res).be.eql(['c']);
      })(done);
    });

    it('client.zrank, client.zrevrank', function(done) {
      var Thunk = thunks();

      Thunk.call(client, client.zadd('zsetA', 1, 'a', 2, 'b', 3, 'c'))(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(3);
        return Thunk.all(this.zrank('zsetA', 'a'), this.zrank('zsetA', 'c'), this.zrank('zsetA', 'x'));
      })(function(error, res) {
        should(res).be.eql([0, 2, null]);
        return Thunk.all(this.zrevrank('zsetA', 'a'), this.zrevrank('zsetA', 'c'), this.zrevrank('zsetA', 'x'));
      })(function(error, res) {
        should(res).be.eql([2, 0, null]);
      })(done);
    });

    it('client.zrem, client.zremrangebyrank, client.zremrangebyscore', function(done) {
      var Thunk = thunks();

      Thunk.call(client, client.zadd('zsetA', 1, 'a', 2, 'b', 3, 'c'))(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(3);
        return Thunk.all(this.zrem('zsetA', 'a'), this.zrem('zsetA', 'a', 'c'), client.zadd('zsetA', 1, 'a', 2, 'b', 3, 'c'));
      })(function(error, res) {
        should(res).be.eql([1, 1, 2]);
        return Thunk.all(this.zremrangebyrank('zsetA', 1, 2), this.zrange('zsetA', 0, -1));
      })(function(error, res) {
        should(res).be.eql([2, ['a']]);
        return this.zadd('zsetA', 2, 'b', 3, 'c', 4, 'd');
      })(function(error, res) {
        should(res).be.equal(3);
        return Thunk.all(this.zremrangebyscore('zsetA', 2, 3), this.zrange('zsetA', 0, -1));
      })(function(error, res) {
        should(res).be.eql([2, ['a', 'd']]);
      })(done);
    });

    it('client.zrevrange, client.zrevrangebyscore', function(done) {
      var Thunk = thunks();

      Thunk.call(client, client.zadd('zsetA', 1, 'a', 2, 'b', 3, 'c'))(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(3);
        return this.zrevrange('zsetA', 1, 100, 'WITHSCORES');
      })(function(error, res) {
        should(res).be.eql(['b', '2', 'a', '1']);
        return this.zrevrangebyscore('zsetA', '+inf', '-inf', 'LIMIT', 1, 2);
      })(function(error, res) {
        should(res).be.eql(['b', 'a']);
      })(done);
    });

    it('client.zunionstore, client.zinterstore', function(done) {
      var Thunk = thunks();

      Thunk.call(client, client.zadd('zsetA', 1, 'a', 2, 'b', 3, 'c'))(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(3);
        return client.zadd('zsetB', 4, 'b', 5, 'c', 6, 'd');
      })(function(error, res) {
        should(res).be.equal(3);
        return this.zunionstore('zsetU', 2, 'zsetA', 'zsetB', 'WEIGHTS', 2, 1, 'AGGREGATE', 'MAX');
      })(function(error, res) {
        should(res).be.equal(4);
        return this.zrange('zsetU', 0, 100, 'WITHSCORES');
      })(function(error, res) {
        should(res).be.eql(['a', '2', 'b', '4', 'c', '6', 'd', '6']);
        return this.zinterstore('zsetI', 2, 'zsetA', 'zsetB', 'WEIGHTS', 1, 2);
      })(function(error, res) {
        should(res).be.equal(2);
        return this.zrange('zsetI', 0, 100, 'WITHSCORES');
      })(function(error, res) {
        should(res).be.eql(['b', '10', 'c', '13']);
      })(done);
    });

    it('client.zrangebylex, client.zlexcount, client.zremrangebylex', function(done) {
      var Thunk = thunks();

      Thunk.call(client, client.zadd('zsetA', 1, 'a', 1, 'b', 1, 'c', 1, 'bc'))(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(4);
        return client.zrangebylex('zsetA', '[b', '[c');
      })(function(error, res) {
        should(res).be.eql(['b', 'bc', 'c']);
        return client.zlexcount('zsetA', '[b', '[c');
      })(function(error, res) {
        should(res).be.equal(3);
        return client.zremrangebylex('zsetA', '[b', '[c');
      })(function(error, res) {
        should(res).be.equal(3);
        return client.zrange('zsetA', 0, 100, 'WITHSCORES');
      })(function(error, res) {
        should(res).be.eql(['a', '1']);
      })(done);
    });

    it('client.zscan', function(done) {
      var Thunk = thunks(function(error) {
        console.error(error);
        done(error);
      });
      var count = 100,
        data = [],
        scanKeys = [];

      while (count--) data.push(count, 'z' + count);

      function fullScan(cursor) {
        return client.zscan('zset', cursor)(function(error, res) {
          scanKeys = scanKeys.concat(res[1]);
          if (res[0] === '0') return res;
          return fullScan(res[0]);
        });
      }

      client.zscan('zset', 0)(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['0', []]);
        var args = data.slice();
        args.unshift('zset');
        return this.zadd.apply(this, args);
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(100);
        return fullScan(0);
      })(function(error, res) {
        should(scanKeys.length).be.equal(200);
        JSONKit.each(data, function(value) {
          should(scanKeys).be.containEql(value + '');
        });
        return this.zscan('zset', 0, 'match', '*0', 'COUNT', 200);
      })(function(error, res) {
        should(res[0] === '0').be.equal(true);
        should(res[1].length === 20).be.equal(true);
      })(done);
    });

  });
};
