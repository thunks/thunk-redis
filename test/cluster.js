'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/
/*jshint -W083*/
var assert = require('assert');
var Thunk = require('thunks')();
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

  it('create 50000 keys', function(done) {
    Thunk(function*() {
      var task = [];
      var len = count;
      while (len--) {
        task.push(Thunk(len + '')(function*(err, res) {
          assert.equal((yield client.set(res, res)), 'OK');
          assert.equal((yield client.get(res)), res);
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
          assert.equal((yield client.get(res)), res);
        }));
      }
      yield Thunk.all(task);
    })(done);
  });

  it('transaction', function(done) {
    Thunk(function*() {
      for (let i = 0; i < count; i++) {
        let res = yield [
          client.multi(i),
          client.set(i, i),
          client.get(i),
          client.exec(i)
        ];
        assert.equal(res[0], 'OK');
        assert.equal(res[1], 'QUEUED');
        assert.equal(res[2], 'QUEUED');
        assert.equal(res[3][0], 'OK');
        assert.equal(res[3][1], i + '');
      }
    })(done);
  });

  it('kill a master', function(done) {
    Thunk(function*() {
      var task = [];
      var result = {};
      var len = 10000;

      client.on('warn', function(err) {
        console.log(err);
      });

      Thunk.delay(100)(function() {
        // kill the default master node
        client.debug('segfault')();
      });

      while (len--) {
        task.push(Thunk(len + '')(function*(err, res) {
          return yield client.get(res);
        })(function(err, res) {
          if (err) throw err;
          result[res] = true;
        }));
        yield Thunk.delay(5);
      }
      yield Thunk.all(task);
      len = 10000;
      while (len--) assert.equal(result[len], true);
    })(done);
  });
});
