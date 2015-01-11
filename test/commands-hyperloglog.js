'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/
/*jshint -W061*/
var should = require('should');
var Thunk = require('thunks')();
var redis = require('../index');

module.exports = function() {
  describe('commands:HyperLogLog', function() {
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

    it('client.pfadd, client.pfcount, client.pfmerge', function(done) {
      client.pfadd('db', 'Redis', 'MongoDB', 'MySQL')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(1);
        return Thunk.all(this.pfcount('db'), this.pfadd('db', 'Redis'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 0]);
        return Thunk.all(this.pfadd('db', 'PostgreSQL'), this.pfcount('db'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([1, 4]);
        return this.pfadd('alphabet', 'a', 'b', 'c');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(1);
        return Thunk.all(this.pfcount('alphabet'), this.pfcount('alphabet', 'db'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql([3, 7]);
        return Thunk.all(this.pfmerge('x', 'alphabet', 'db'), this.pfcount('x'));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['OK', 7]);
      })(done);
    });

  });
};
