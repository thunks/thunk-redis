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

    it('redis.createClient(path, options)', function(done) {
      var connect = false,
        client = redis.createClient('/tmp/redis2.sock', {
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
  });
};
