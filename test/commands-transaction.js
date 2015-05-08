'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var Thunk = require('thunks')();
var redis = require('../index');

module.exports = function() {
  describe('commands:Transaction', function() {
    var client1, client2;

    beforeEach(function(done) {
      client1 = redis.createClient();
      client1.on('error', function(error) {
        console.error('redis client:', error);
      });

      client2 = redis.createClient();
      client2.on('error', function(error) {
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
    });

    it('client.multi, client.discard, client.exec', function(done) {
      client1.multi()(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
        return Thunk.all(this.incr('users'), this.incr('users'), this.incr('users'));
      })(function(error, res) {
        should(res).be.eql(['QUEUED', 'QUEUED', 'QUEUED']);
        return this.exec();
      })(function(error, res) {
        should(res).be.eql(['1', '2', '3']);
        return this.discard();
      })(function(error, res) {
        should(error).be.instanceOf(Error);
        return Thunk.all(this.multi(), this.ping(), this.ping(), this.discard());
      })(function(error, res) {
        should(res).be.eql(['OK', 'QUEUED', 'QUEUED', 'OK']);
        return this.exec();
      })(function(error, res) {
        should(error).be.instanceOf(Error);
      })(done);
    });

    it('client.watch, client.unwatch', function(done) {
      client1.watch('users')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
        return Thunk.all(this.multi(), this.incr('users'), this.incr('users'));
      })(function(error, res) {
        should(res).be.eql(['OK', 'QUEUED', 'QUEUED']);
        return client2.incr('users');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.exec();
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(null);
        return Thunk.all(this.watch('i'), this.unwatch(), this.multi(), this.incr('i'), this.incr('i'));
      })(function(error, res) {
        should(res).be.eql(['OK', 'OK', 'OK', 'QUEUED', 'QUEUED']);
        return client2.incr('i');
      })(function(error, res) {
        should(res).be.equal(1);
        return this.exec();
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([2, 3]);
      })(done);
    });

  });
};
