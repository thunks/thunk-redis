'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var thunks = require('thunks');
var redis = require('../index');

module.exports = function() {
  describe('commands:Connection', function() {
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

    it('client.echo', function(done) {
      client.echo('hello world!')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('hello world!');
        return this.echo(123);
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('123');
      })(done);
    });

    it('client.ping', function(done) {
      client.ping()(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('PONG');
      })(done);
    });

    it('client.select', function(done) {
      client.select(10)(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
        return this.select(99);
      })(function(error, res) {
        should(error).be.instanceOf(Error);
        should(res).be.equal(undefined);
      })(done);
    });

    it('client.auth', function(done) {
      client.auth('123456')(function(error, res) {
        should(error).be.instanceOf(Error);
        should(res).be.equal(undefined);
        return this.config('set', 'requirepass', '123456');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
        return this.auth('123456');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
        return this.config('set', 'requirepass', '');
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
      })(done);
    });

    it('client.quit', function(done) {
      client.quit()(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
      })(done);
    });

  });
};
