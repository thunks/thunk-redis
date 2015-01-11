'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var redis = require('../index');
var clientTest = require('./client');
var clientTest2 = require('./client2');
var commandsConnection = require('./commands-connection');
var commandsHash = require('./commands-hash');
var commandsKey = require('./commands-key');
var commandsList = require('./commands-list');
var commandsPubsub = require('./commands-pubsub');
var commandsScript = require('./commands-script');
var commandsServer = require('./commands-server');
var commandsHyperLogLog  = require('./commands-hyperloglog');
var commandsSet = require('./commands-set');
var commandsSortedSet = require('./commands-sorted-set');
var commandsString = require('./commands-string');
var commandsTransaction = require('./commands-transaction');

describe('thunk-redis', function() {

  before(function(done) {
    redis.createClient({
      database: 0,
      debugMode: false
    }).flushall()(function(error, res) {
      should(error).be.equal(null);
      should(res).be.equal('OK');
      return this.dbsize();
    })(function(error, res) {
      should(error).be.equal(null);
      should(res).be.equal(0);
      return this.select(1);
    })(function(error, res) {
      should(error).be.equal(null);
      should(res).be.equal('OK');
      return this.flushdb();
    })(function(error, res) {
      should(error).be.equal(null);
      should(res).be.equal('OK');
      return this.dbsize();
    })(function(error, res) {
      should(error).be.equal(null);
      should(res).be.equal(0);
      this.clientEnd();
    })(done);
  });

  after(function() {
    setTimeout(function() {
      process.exit();
    }, 1000);
  });

  clientTest();
  clientTest2();

  commandsKey();
  commandsSet();
  commandsHash();
  commandsList();
  commandsPubsub();
  commandsScript();
  commandsServer();
  commandsString();
  commandsSortedSet();
  commandsConnection();
  commandsHyperLogLog();
  commandsTransaction();

  try {
    /*jshint -W054 */
    var check = new Function('return function*(){}');
    require('./chaos')();
  } catch (e) {
    console.log('Not support generator!');
  }
});
