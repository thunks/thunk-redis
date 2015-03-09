'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/
/*jshint -W083*/
var assert = require('assert');
var thunks = require('thunks');
var redis = require('../index');
var client = redis.createClient(7000);
var count = 50000;

before(function(done) {
  client.info()(done);
});

after(function() {
  setTimeout(function() {
    process.exit();
  }, 1000);
});

describe('cluster test', function() {
  var Thunk = thunks(function(err) {
    throw err;
  });

  it('create 50000 keys', function(done) {
    Thunk(function*() {
      var task = [];
      var len = count;
      while (len--) {
        task.push(Thunk(len + '')(function*(err, res) {
          assert((yield client.set(res, res)) === 'OK');
          assert((yield client.get(res)) === res);
        }));
      }
      yield Thunk.all(task);
    })(done);
  });

  it('get 50000 keys', function(done) {
    Thunk(function*() {
      var task = [];
      var len = count;
      while (len--) {
        task.push(Thunk(len + '')(function*(err, res) {
          assert((yield client.get(res)) === res);
        }));
      }
      yield Thunk.all(task);
    })(done);
  });
});
