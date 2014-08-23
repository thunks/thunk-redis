'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var thunks = require('thunks');
var redis = require('../index');

module.exports = function () {
  describe('commands:Key', function () {
    var client;

    before(function () {
      client = redis.createClient({database: 0});
    });

    beforeEach(function (done) {
      client.flushdb()(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
      })(done);
    });

    after(function () {
      client.end();
    });

    it('client.del, client.exists', function (done) {
      var Thunk = thunks(function (error) {
        console.error(error);
        done(error);
      });

      Thunk.call(client, client.mset({
        key: 1,
        key1: 2,
        key2: 3,
        key3: 4
      }))(function (error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function (error, res) {
        should(res).be.equal(1);
        return this.exists('key1');
      })(function (error, res) {
        should(res).be.equal(1);
        return this.exists('key2');
      })(function (error, res) {
        should(res).be.equal(1);
        return this.exists('key3');
      })(function (error, res) {
        should(res).be.equal(1);
        return this.del('key');
      })(function (error, res) {
        should(res).be.equal(1);
        return this.exists('key');
      })(function (error, res) {
        should(res).be.equal(0);
        return this.del('key1', 'key2', 'key3');
      })(function (error, res) {
        should(res).be.equal(3);
        return this.exists('key1');
      })(function (error, res) {
        should(res).be.equal(0);
        return this.exists('key2');
      })(function (error, res) {
        should(res).be.equal(0);
        return this.exists('key3');
      })(function (error, res) {
        should(res).be.equal(0);
        return this.del('key');
      })(function (error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it.skip('client.dump, client.restore', function (done) {
      var serializedValue,
        Thunk0 = thunks(),
        Thunk = thunks(function (error) {
          console.error(error);
          done(error);
        });

      Thunk.call(client, client.dump('dumpKey'))(function (error, res) {
        should(res).be.equal(null);
        return this.set('dumpKey', 'hello, dumping world!');
      })(function (error, res) {
        should(res).be.equal('OK');
        return this.dump('dumpKey');
      })(function (error, res) {
        should(res).be.type('string');
        serializedValue = res;
        return Thunk0.call(this, this.restore('restoreKey', 0, 'errorValue'))(function (error, res) {
          should(error).be.instanceOf(Error);
          should(res).be.equal(undefined);
          return this.restore('restoreKey', 0, serializedValue);
        });
      })(function (error, res) {
        should(res).be.equal('OK');
        return this.get('restoreKey');
      })(function (error, res) {
        should(res).be.equal('hello, dumping world!');
        return this.set('key', 123);
      })(function (error, res) {
        should(res).be.equal('OK');
        return this.get('key');
      })(function (error, res) {
        should(res).be.equal('123');
        return Thunk0.call(this, this.restore('key', 0, serializedValue))(function (error, res) {
          should(error).be.instanceOf(Error);
          should(res).be.equal(undefined);
          return this.get('key');
        });
      })(function (error, res) {
        should(res).be.equal('123');
        return this.restore('key', 1000, serializedValue, 'REPLACE');
      })(function (error, res) {
        should(res).be.equal('OK');
        return this.get('key');
      })(function (error, res) {
        should(res).be.equal('hello, dumping world!');
        return Thunk.delay(2000);
      })(function (error, res) {
        return this.exists('key');
      })(function (error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.expire', function (done) {
      var Thunk = thunks(function (error) {
        console.error(error);
        done(error);
      });

      Thunk.call(client, client.set('key', 123))(function (error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function (error, res) {
        should(res).be.equal(1);
        return this.expire('key', 1);
      })(function (error, res) {
        should(res).be.equal(1);
        return Thunk.delay.call(this, 1010)(function () {
          return this.exists('key');
        });
      })(function (error, res) {
        should(res).be.equal(0);
        return this.expire('key', 1);
      })(function (error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.expireat', function (done) {
      var Thunk = thunks(function (error) {
        console.error(error);
        done(error);
      });

      Thunk.call(client, client.set('key', 123))(function (error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function (error, res) {
        should(res).be.equal(1);
        return this.expireat('key', Math.floor(Date.now() / 1000 + 1));
      })(function (error, res) {
        should(res).be.equal(1);
        return Thunk.delay.call(this, 1001)(function () {
          return this.exists('key');
        });
      })(function (error, res) {
        should(res).be.equal(0);
        return this.expireat('key', Math.floor(Date.now() / 1000 + 1));
      })(function (error, res) {
        should(res).be.equal(0);
      })(done);
    });

    it('client.keys', function (done) {
      var Thunk = thunks(function (error) {
        console.error(error);
        done(error);
      });

      Thunk.call(client, client.keys('*'))(function (error, res) {
        should(res).be.eql([]);
        return this.mset({
          a: 123,
          a1: 123,
          b: 123,
          b1: 123,
          c: 123,
          c1: 123
        });
      })(function (error, res) {
        should(res).be.equal('OK');
        return this.keys('*');
      })(function (error, res) {
        should(res.sort()).be.eql(['a', 'a1', 'b', 'b1', 'c', 'c1']);
        return this.keys('a*');
      })(function (error, res) {
        should(res.sort()).be.eql(['a', 'a1']);
        return this.keys('?1');
      })(function (error, res) {
        should(res.sort()).be.eql(['a1', 'b1', 'c1']);
      })(done);
    });

    it.skip('client.migrate', function () {});
    it.skip('client.move', function () {});
    it.skip('client.object', function () {});
    it.skip('client.persist', function () {});
    it.skip('client.pexpire', function () {});
    it.skip('client.pexpireat', function () {});
    it.skip('client.pttl', function () {});
    it.skip('client.randomkey', function () {});
    it.skip('client.rename', function () {});
    it.skip('client.renamenx', function () {});
    it.skip('client.sort', function () {});
    it.skip('client.ttl', function () {});
    it.skip('client.scan', function () {});

  });
};