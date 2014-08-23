'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var thunks = require('thunks');
var redis = require('../index');

module.exports = function () {
  describe('commands:Hash', function () {
    var client;

    before(function () {
      client = redis.createClient({database: 0});
    });

    beforeEach(function (done) {
      client.flushdb()(function (error, res) {
        should(error).be.equal(null);
        should(res).be.equal('OK');
      })(done);
    });

    after(function () {
      client.end();
    });

    it.skip('client.hdel', function () {});

  });
};