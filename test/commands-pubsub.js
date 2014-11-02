'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var thunks = require('thunks');
var redis = require('../index');

module.exports = function () {
  describe('commands:Pubsub', function () {
    var client1, client2;

    beforeEach(function (done) {
      client1 = redis.createClient({debugMode: false});
      client1.on('error', function (error) {
        console.error('redis client:', error);
      });

      client2 = redis.createClient({debugMode: false});
      client2.on('error', function (error) {
        console.error('redis client:', error);
      });

      client1.flushdb()(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
      })(done);
    });

    afterEach(function () {
      client1.clientEnd();
      client2.clientEnd();
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
          if (pattern === 'b.*') should(n).be.equal(1);
          if (pattern === '123') {
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

    it('client.subscribe, client.unsubscribe', function (done) {
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

    it('client.publish', function (done) {
      var messages = [];
      client1
        .on('message', function (channel, message) {
          messages.push(message);
        })
        .on('pmessage', function (pattern, channel, message) {
          messages.push(message);
          if (message === 'end') {
            should(messages).be.eql(['hello1', 'hello2', 'hello2', 'end']);
            done();
          }
        });
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
        return this.publish('a', 'hello1');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(1);
        return client1.psubscribe('*');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.publish('a', 'hello2');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(2);
        return this.publish('b', 'end');
      })(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(1);
      });
    });

    it.skip('client.pubsub', function (done) {});

  });
};
