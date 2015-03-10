'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/
/*jshint -W106*/

var should = require('should');
var redis = require('../index');

module.exports = function() {
  describe('createClient2', function() {

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

    it('redis.createClient(address, options)', function(done) {
      var connect = false,
        client = redis.createClient('127.0.0.1:6379', {
          database: 1
        });

      client.on('connect', function() {
        connect = true;
      });

      client.info()(function(error, res) {
        should(error).be.equal(null);
        should(connect).be.equal(true);
        should(res.redis_version).be.type('string');
        return this.clientEnd();
      })(done);
    });

    it('client.migrate', function(done) {
      var client = redis.createClient();
      var client2 = redis.createClient(6380);

      client.set('key', 123)(function(error, res) {
        should(res).be.equal('OK');
        return client2.flushdb();
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.migrate('127.0.0.1', 6380, 'key', 0, 100);
      })(function(error, res) {
        should(res).be.equal('OK');
        return this.exists('key');
      })(function(error, res) {
        should(res).be.equal(0);
        return client2.get('key');
      })(function(error, res) {
        should(res).be.equal('123');
      })(function() {
        this.clientEnd();
        client2.clientEnd();
      })(done);
    });
  });
};
