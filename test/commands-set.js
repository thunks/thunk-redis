'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var Thunk = require('thunks')();
var JSONKit = require('jsonkit');
var redis = require('../index');

module.exports = function() {
  describe('commands:Set', function() {
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

    it('client.sadd, client.scard', function(done) {
      client.scard('setA')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        return Thunk.all(this.set('key', 'abc'), this.scard('key'));
      })(function(error, res) {
        should(error).be.instanceOf(Error);
        return this.sadd('key', 'a');
      })(function(error, res) {
        should(error).be.instanceOf(Error);
        return Thunk.all(this.sadd('setA', 'a', 'b'), this.sadd('setA', 'b', 'c'), this.sadd('setA', 'a', 'c'), this.scard('setA'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 1, 0, 3]);
      })(done);
    });

    it('client.sdiff, client.sdiffstore', function(done) {
      client.sdiff('setA')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([]);
        return Thunk.all(this.sadd('setA', 'a', 'b', 'c'), this.sadd('setB', 'b', 'c', 'd'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 3]);
        return Thunk.all(client.sdiff('setA'), client.sdiff('setA', 'setB'), client.sdiff('setA', 'setC'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res[0].length).be.equal(3);
        should(res[0]).be.containEql('a');
        should(res[0]).be.containEql('b');
        should(res[0]).be.containEql('c');
        should(res[1].length).be.equal(1);
        should(res[1]).be.containEql('a');
        should(res[2].length).be.equal(3);
        should(res[2]).be.containEql('a');
        should(res[2]).be.containEql('b');
        should(res[2]).be.containEql('c');
        return Thunk.all(client.sdiffstore('setC', 'setA', 'setB'), client.sdiffstore('setA', 'setA', 'setB'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([1, 1]);
        return Thunk.all(this.scard('setA'), this.scard('setC'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([1, 1]);
      })(done);
    });

    it('client.sinter, client.sinterstore', function(done) {
      client.sinter('setA')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([]);
        return Thunk.all(this.sadd('setA', 'a', 'b', 'c'), this.sadd('setB', 'b', 'c', 'd'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 3]);
        return Thunk.all(client.sinter('setA'), client.sinter('setA', 'setB'), client.sinter('setA', 'setC'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res[0].length).be.equal(3);
        should(res[0]).be.containEql('a');
        should(res[0]).be.containEql('b');
        should(res[0]).be.containEql('c');
        should(res[1].length).be.equal(2);
        should(res[1]).be.containEql('b');
        should(res[1]).be.containEql('c');
        should(res[2].length).be.equal(0);
        return Thunk.all(client.sinterstore('setC', 'setA', 'setB'), client.sinterstore('setA', 'setA', 'setB'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 2]);
        return Thunk.all(this.scard('setA'), this.scard('setC'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 2]);
      })(done);
    });

    it('client.sismember, client.smembers', function(done) {
      client.smembers('setA')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal([]);
        return Thunk.all(this.set('key', 'abc'), this.smembers('key'));
      })(function(error, res) {
        should(error).be.instanceOf(Error);
        return Thunk.all(this.sadd('setA', 'a', 'b', 'c'), this.smembers('setA'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res[0]).be.equal(3);
        should(res[1].length).be.equal(3);
        should(res[1]).be.containEql('a');
        should(res[1]).be.containEql('b');
        should(res[1]).be.containEql('c');
        return Thunk.all(this.sismember('setA', 'a'), this.sismember('setA', 'd'), this.sismember('setB', 'd'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([1, 0, 0]);
      })(done);
    });

    it('client.smove, client.spop', function(done) {
      client.smove('setA', 'setB', 'a')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        return Thunk.all(this.sadd('setA', 'a', 'b', 'c'), this.smove('setA', 'setB', 'a'), this.smove('setA', 'setB', 'd'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 1, 0]);
        return Thunk.all(this.sadd('setB', 'b'), this.smove('setA', 'setB', 'b'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([1, 1]);
        return Thunk.all(this.spop('setA'), this.spop('setC'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['c', null]);
      })(done);
    });

    it('client.srandmember, client.srem', function(done) {
      client.srandmember('setA')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(null);
        return Thunk.all(this.sadd('setA', 'a', 'b', 'c'), this.srandmember('setA'), this.srandmember('setA', 2));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res[0]).be.eql(3);
        should(['a', 'b', 'c']).be.containEql(res[1]);
        should(res[2].length).be.equal(2);
        should(['a', 'b', 'c']).be.containEql(res[2][0]);
        should(['a', 'b', 'c']).be.containEql(res[2][1]);
        return Thunk.all(this.scard('setA'), this.srem('setA', 'b', 'd'), this.srem('setA', 'b', 'a', 'c'), this.scard('setA'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 1, 2, 0]);
      })(done);
    });

    it('client.sunion, client.sunionstore', function(done) {
      client.sunion('setA')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([]);
        return Thunk.all(this.sadd('setA', 'a', 'b', 'c'), this.sadd('setB', 'b', 'c', 'd'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 3]);
        return Thunk.all(client.sunion('setA'), client.sunion('setA', 'setB'), client.sunion('setA', 'setC'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res[0].length).be.equal(3);
        should(res[0]).be.containEql('a');
        should(res[0]).be.containEql('b');
        should(res[0]).be.containEql('c');
        should(res[1].length).be.equal(4);
        should(res[1]).be.containEql('a');
        should(res[1]).be.containEql('b');
        should(res[1]).be.containEql('c');
        should(res[1]).be.containEql('d');
        should(res[2].length).be.equal(3);
        return Thunk.all(client.sunionstore('setC', 'setA', 'setB'), client.sunionstore('setA', 'setA', 'setB'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([4, 4]);
        return Thunk.all(this.scard('setA'), this.scard('setC'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([4, 4]);
      })(done);
    });

    it('client.sscan', function(done) {
      var count = 100,
        data = [],
        scanKeys = [];

      while (count--) data.push('m' + count);

      function fullScan(cursor) {
        return client.sscan('set', cursor)(function(error, res) {
          scanKeys = scanKeys.concat(res[1]);
          if (res[0] === '0') return res;
          return fullScan(res[0]);
        });
      }

      client.sscan('set', 0)(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['0', []]);
        var args = data.slice();
        args.unshift('set');
        return this.sadd.apply(this, args);
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(100);
        return fullScan(0);
      })(function(error, res) {
        should(scanKeys.length).be.equal(100);
        JSONKit.each(data, function(value) {
          should(scanKeys).be.containEql(value);
        });
        return this.sscan('set', 0, 'count', 20);
      })(function(error, res) {
        should(res[0] > 0).be.equal(true);
        should(res[1].length > 0).be.equal(true);
        return this.sscan('set', 0, 'count', 200, 'match', '*0');
      })(function(error, res) {
        should(res[0] === '0').be.equal(true);
        should(res[1].length === 10).be.equal(true);
      })(done);
    });

  });
};
