'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var thunks = require('thunks');
var redis = require('../index');

module.exports = function () {
  describe('commands:Pubsub', function () {
    var client1, client2;

    before(function () {
      client1 = redis.createClient({debugMode: true});
      client1.on('error', function (error) {
        console.error('redis client:', error);
      });

      client2 = redis.createClient({debugMode: true});
      client2.on('error', function (error) {
        console.error('redis client:', error);
      });
    });

    beforeEach(function (done) {
      client1.removeAllListeners();
      client2.removeAllListeners();
      client1.flushdb()(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
      })(done);
    });

    after(function () {
      client1.end();
      client2.end();
    });

    it('client.psubscribe, client.punsubscribe', function (done) {
      client1
        .on('psubscribe', function (pattern, n) {
          if (pattern === 'a.*') should(n).be.equal(1);
          if (pattern === 'b.*') should(n).be.equal(2);
          if (pattern === '123') should(n).be.equal(3);
        })
        .on('punsubscribe', function (pattern, n) {
          if (pattern === 'a.*') should(n).be.equal(2);
          if (pattern === '*') should(n).be.equal(2);
          if (pattern === '123') should(n).be.equal(1);
          if (pattern === 'b.*') {
            should(n).be.equal(0);
            done();
          }
        });
      client1.psubscribe()(function (error, res) {
        should(error).be.instanceOf(Error);
        should(res).be.equal(undefined);
      });
      client1.psubscribe('a.*', 'b.*', '123')(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.punsubscribe();
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
      });
    });

    it.skip('client.subscribe, client.unsubscribe', function (done) {
      client1
        .on('subscribe', function (pattern, n) {
          if (pattern === 'a') should(n).be.equal(1);
          if (pattern === 'b') should(n).be.equal(2);
          if (pattern === '123') should(n).be.equal(3);
        })
        .on('unsubscribe', function (pattern, n) {
          if (pattern === 'a') should(n).be.equal(2);
          if (pattern === '*') should(n).be.equal(2);
          if (pattern === '123') should(n).be.equal(1);
          if (pattern === 'b') {
            should(n).be.equal(0);
            done();
          }
        });
      client1.subscribe()(function (error, res) {
        should(error).be.instanceOf(Error);
        should(res).be.equal(undefined);
      });
      client1.subscribe('a', 'b', '123')(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.unsubscribe('a', '*', '123', 'b');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
      });
    });

    it.skip('client.publish', function (done) {
      // client1
      //   .on('subscribe', function (pattern, n) {
      //     console.log(pattern, n);
      //     if (pattern === 'a') should(n).be.equal(1);
      //     if (pattern === 'b') should(n).be.equal(2);
      //     if (pattern === '123') should(n).be.equal(3);
      //   })
      //   .on('unsubscribe', function (pattern, n) {
      //     if (pattern === 'a') should(n).be.equal(2);
      //     if (pattern === '*') should(n).be.equal(2);
      //     if (pattern === '123') should(n).be.equal(1);
      //     if (pattern === 'b') {
      //       should(n).be.equal(0);
      //       done();
      //     }
      //   });
      client2.publish()(function (error, res) {
        should(error).be.instanceOf(Error);
        should(res).be.equal(undefined);
        return this.publish('a', 'hello');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        return client1.subscribe('a');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.publish('a', 'hello');
      })(function (error, res) {
        console.log(321321321321, error, res);
        should(error).be.equal(null);
        should(res).be.equal(1);
        return client2.psubscribe('*');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.publish('a', 'hello');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(2);
        return this.publish('b', 'hello');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(1);
      })(done);
    });

  });
};
