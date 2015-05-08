'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var Thunk = require('thunks')();
var redis = require('../index');

module.exports = function() {
  describe('commands:Pubsub', function() {
    var client1, client2, client3;

    beforeEach(function(done) {
      client1 = redis.createClient();
      client1.on('error', function(error) {
        console.error('redis client:', error);
      });

      client2 = redis.createClient();
      client2.on('error', function(error) {
        console.error('redis client:', error);
      });

      client3 = redis.createClient();
      client3.on('error', function(error) {
        console.error('redis client:', error);
      });

      client1.flushdb()(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
      })(done);
    });

    afterEach(function() {
      client1.clientEnd();
      client2.clientEnd();
      client3.clientEnd();
    });

    it('client.psubscribe, client.punsubscribe', function(done) {
      client1
        .on('psubscribe', function(pattern, n) {
          if (pattern === 'a.*') should(n).be.equal(1);
          if (pattern === 'b.*') should(n).be.equal(2);
          if (pattern === '123') should(n).be.equal(3);
        })
        .on('punsubscribe', function(pattern, n) {
          if (pattern === 'a.*') should(n).be.equal(2);
          if (pattern === 'b.*') should(n).be.equal(1);
          if (pattern === '123') {
            should(n).be.equal(0);
            done();
          }
        });
      client1.psubscribe()(function(error, res) {
        should(error).be.instanceOf(Error);
        should(res).be.equal(undefined);
      });
      client1.psubscribe('a.*', 'b.*', '123')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.punsubscribe();
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
      });
    });

    it('client.subscribe, client.unsubscribe', function(done) {
      client1
        .on('subscribe', function(pattern, n) {
          if (pattern === 'a') should(n).be.equal(1);
          if (pattern === 'b') should(n).be.equal(2);
          if (pattern === '123') should(n).be.equal(3);
        })
        .on('unsubscribe', function(pattern, n) {
          if (pattern === 'a') should(n).be.equal(2);
          if (pattern === '*') should(n).be.equal(2);
          if (pattern === '123') should(n).be.equal(1);
          if (pattern === 'b') {
            should(n).be.equal(0);
            done();
          }
        });
      client1.subscribe()(function(error, res) {
        should(error).be.instanceOf(Error);
        should(res).be.equal(undefined);
      });
      client1.subscribe('a', 'b', '123')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.unsubscribe('a', '*', '123', 'b');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
      });
    });

    it('client.publish', function(done) {
      var messages = [];
      client1
        .on('message', function(channel, message) {
          messages.push(message);
        })
        .on('pmessage', function(pattern, channel, message) {
          messages.push(message);
          if (message === 'end') {
            should(messages).be.eql(['hello1', 'hello2', 'hello2', 'end']);
            Thunk.delay(10)(done);
          }
        });
      client2.publish()(function(error, res) {
        should(error).be.instanceOf(Error);
        should(res).be.equal(undefined);
        return this.publish('a', 'hello');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        return client1.subscribe('a');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.publish('a', 'hello1');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(1);
        return client1.psubscribe('*');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.publish('a', 'hello2');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(2);
        return this.publish('b', 'end');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(1);
      });
    });

    it('client.pubsub', function(done) {
      Thunk.call(client3, client1.subscribe('a', 'b', 'ab'))(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.pubsub('channels');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res.length).be.equal(3);
        should(res).be.containEql('a');
        should(res).be.containEql('ab');
        should(res).be.containEql('b');
        return client2.subscribe('b', 'ab', 'abc');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(undefined);
        return this.pubsub('channels', 'a*');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res.length).be.equal(3);
        should(res).be.containEql('a');
        should(res).be.containEql('ab');
        should(res).be.containEql('abc');
        return Thunk.all(this.pubsub('numsub'), this.pubsub('numsub', 'a', 'b', 'ab', 'd'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res[0]).be.eql({});
        should(+res[1].a).be.equal(1);
        should(+res[1].b).be.equal(2);
        should(+res[1].ab).be.equal(2);
        should(+res[1].d).be.equal(0);
        return this.pubsub('numpat');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        return Thunk.all(client1.psubscribe('a.*', 'b.*', '123'), client2.psubscribe('a.*', 'b.*', '456'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([undefined, undefined]);
        return this.pubsub('numpat');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(6);
      })(done);
    });

  });
};
