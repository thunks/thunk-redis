'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/
/*jshint -W106*/

var should = require('should');
var Bluebird = require('bluebird');
var redis = require('../index');

module.exports = function() {
  describe('createClient', function() {
    var time = '' + Date.now();

    it('redis.createClient()', function(done) {
      var connect = false,
        client = redis.createClient();

      client.on('connect', function() {
        connect = true;
      });
      client.info()(function(error, res) {
        should(error).be.equal(null);
        should(connect).be.equal(true);
        should(res.redis_version).be.type('string');
        return this.select(1);
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
        return this.set('test', time);
      })(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
        this.clientEnd();
      })(done);
    });

    it('redis.createClient(options)', function(done) {
      var client = redis.createClient({
        database: 1
      });

      client.get('test')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(time);
        this.clientEnd();
      })(done);
    });

    it('redis.createClient({usePromise: true})', function(done) {
      if (typeof Promise !== 'function') return done();
      var client = redis.createClient({
        usePromise: true
      });
      var promise = client.info();
      should(promise).be.instanceof(Promise);
      promise.then(function(res) {
        done();
      }, done);
    });

    it('redis.createClient({usePromise: Bluebird})', function(done) {
      var client = redis.createClient({
        usePromise: Bluebird
      });
      var promise = client.info();
      should(promise).be.instanceof(Bluebird);
      promise.then(function(res) {
        done();
      }, done);
    });

    it('redis.createClient(port, options)', function(done) {
      var client = redis.createClient(6379, {
        database: 1
      });

      client.get('test')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(time);
        this.clientEnd();
      })(done);
    });

    it('redis.createClient(port, host, options)', function(done) {
      var client = redis.createClient(6379, 'localhost', {
        database: 1
      });

      client.get('test')(function(error, res) {
        should(error).be.equal(null);
        should(res).be.equal(time);
        this.clientEnd();
      })(done);
    });
  });
};
