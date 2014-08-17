'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var redis = require('../index');

describe('thunk-redis', function () {

  before(function (done) {
    var client = redis.createClient({database: 0});

    client.flushdb()(function (error, res) {
      should(error).be.equal(null);
      should(res).be.equal('OK');
      return this.dbsize()(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal(0);
        this.end();
      });
    })(done);
  });

  after(function () {
    process.exit();
  });

  describe('createClient', function () {

    it('redis.createClient(port)', function (done) {
      var connect = false,
        client = redis.createClient(6379, 'localhost', {database: 0});

      client.on('connect', function () {
        connect = true;
      });
      client.info()(function (error, res) {
        should(error).be.equal(null);
        should(connect).be.equal(true);
        should(res.redis_version).be.type('string');
        this.end();
      })(done);
    });

    it('redis.createClient(path)', function (done) {
      var connect = false,
        client = redis.createClient('/tmp/redis.sock', {database: 0});

      client.on('connect', function () {
        connect = true;
      });
      client.info()(function (error, res) {
        should(error).be.equal(null);
        should(connect).be.equal(true);
        should(res.redis_version).be.type('string');
        this.end();
      })(done);
    });
  });
});