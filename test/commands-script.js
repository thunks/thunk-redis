'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/
/*jshint -W061*/
var should = require('should');
var Thunk = require('thunks')();
var redis = require('../index');

module.exports = function() {
  describe('commands:Script', function() {
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

    it('client.eval', function(done) {
      client.eval('return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}', 2, 'key1', 'key2', 'first', 'second')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['key1', 'key2', 'first', 'second']);
        return this.eval('return redis.call("set",KEYS[1],"bar")', 1, 'foo');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
        return Thunk.all(this.get('foo'), this.eval('return redis.call("get","foo")', 0));
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.eql(['bar', 'bar']);
        return Thunk.all(this.lpush('list', 123), this.eval('return redis.call("get", "list")', 0));
      })(function(error, res) {
        should(error).be.instanceOf(Error);
        return this.eval('return redis.pcall("get", "list")', 0);
      })(function(error, res) {
        should(error).be.instanceOf(Error);
      })(done);
    });

    it('client.script, client.evalsha', function(done) {
      var sha = null;

      client.script('load', 'return "hello thunk-redis"')(function(error, res) {
        should(error).be.equal(null);
        sha = res;
        return this.evalsha(res, 0);
      })(function(error, res) {
        should(res).be.equal('hello thunk-redis');
        return this.script('exists', sha);
      })(function(error, res) {
        should(res).be.eql([1]);
        return Thunk.all(this.script('flush'), this.script('exists', sha));
      })(function(error, res) {
        should(res).be.eql(['OK', [0]]);
        return this.script('kill');
      })(function(error, res) {
        should(error).be.instanceOf(Error);
      })(done);
    });

  });
};
