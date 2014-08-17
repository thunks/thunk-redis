'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var redis = require('../index');
var clientTest = require('./client');
var clientTest2 = require('./client2');

describe('thunk-redis', function () {

  before(function (done) {
    redis.createClient({database: 0}).flushdb()(function (error, res) {
      should(error).be.equal(null);
      should(res).be.equal('OK');
      return this.dbsize();
    })(function (error, res) {
      should(error).be.equal(null);
      should(res).be.equal(0);
      return this.select(1);
    })(function (error, res) {
      should(error).be.equal(null);
      should(res).be.equal('OK');
      return this.flushdb();
    })(function (error, res) {
      should(error).be.equal(null);
      should(res).be.equal('OK');
      return this.dbsize();
    })(function (error, res) {
      should(error).be.equal(null);
      should(res).be.equal(0);
      this.end();
    })(done);
  });

  after(function () {
    process.exit();
  });

  clientTest();

  clientTest2();
});