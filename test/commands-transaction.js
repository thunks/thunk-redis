'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var thunks = require('thunks');
var redis = require('../index');

module.exports = function() {
  describe('commands:Transaction', function() {
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

    it.skip('client.discard', function() {});

  });
};
