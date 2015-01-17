'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/
/*jshint -W106*/

var Thunk = require('thunks')();
var redis = require('../index');
var nodeRedis = require('redis');

Thunk(function*() {
  var timeN = 0;
  var timeT = 0;
  var testLen = 100000;
  var titleN = 'redis(N):';
  var titleT = 'redis(T):';
  var clientN = nodeRedis.createClient();
  var clientT = redis.createClient({database: 1});

  var smallStr = 'teambition';
  var longStr = (new Array(4097).join('-'));

  function printResult(title, timeN, timeT) {
    console.log(titleN, title, Math.floor(testLen * 1000 / timeN) + ' ops/sec', '100%');
    console.log(titleT, title, Math.floor(testLen * 1000 / timeT) + ' ops/sec', ((timeN / timeT) * 100).toFixed(1) + '%');
    console.log('');
  }


  console.log(titleN + 'node_redis\n', yield function(done) {
    clientN.flushdb(done);
  });
  console.log(titleT + 'thunk-redis\n', yield clientT.flushdb());
  console.log('Start...\n\n');

  // PING
  timeN = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientN.ping(done);
    });
  });
  timeN = Date.now() - timeN;

  timeT = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientT.ping()(done);
    });
  });
  timeT = Date.now() - timeT;
  printResult('PING', timeN, timeT);

  // SET
  timeN = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientN.set('zensh_thunks_00000001', smallStr, done);
    });
  });
  timeN = Date.now() - timeN;

  timeT = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientT.set('zensh_thunks_00000001', smallStr)(done);
    });
  });
  timeT = Date.now() - timeT;
  printResult('SET small string', timeN, timeT);

  // GET
  timeN = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientN.get('zensh_thunks_00000001', done);
    });
  });
  timeN = Date.now() - timeN;

  timeT = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientT.get('zensh_thunks_00000001')(done);
    });
  });
  timeT = Date.now() - timeT;
  printResult('GET small string', timeN, timeT);

  // SET
  timeN = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientN.set('zensh_thunks_00000002', longStr, done);
    });
  });
  timeN = Date.now() - timeN;

  timeT = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientT.set('zensh_thunks_00000002', longStr)(done);
    });
  });
  timeT = Date.now() - timeT;
  printResult('SET long string', timeN, timeT);

  // GET
  timeN = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientN.get('zensh_thunks_00000002', done);
    });
  });
  timeN = Date.now() - timeN;

  timeT = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientT.get('zensh_thunks_00000002')(done);
    });
  });
  timeT = Date.now() - timeT;
  printResult('GET long string', timeN, timeT);

  // INCR
  timeN = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientN.incr('zensh_thunks_00000003', done);
    });
  });
  timeN = Date.now() - timeN;

  timeT = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientT.incr('zensh_thunks_00000003')(done);
    });
  });
  timeT = Date.now() - timeT;
  printResult('INCR', timeN, timeT);

  // LPUSH
  timeN = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientN.lpush('zensh_thunks_00000004', smallStr, done);
    });
  });
  timeN = Date.now() - timeN;

  timeT = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientT.lpush('zensh_thunks_00000004', smallStr)(done);
    });
  });
  timeT = Date.now() - timeT;
  printResult('LPUSH', timeN, timeT);

  // LRANGE
  timeN = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientN.lrange('zensh_thunks_00000004', '0', '100', done);
    });
  });
  timeN = Date.now() - timeN;

  timeT = Date.now();
  yield genTasks(testLen, function(done) {
    setImmediate(function() {
      clientT.lrange('zensh_thunks_00000004', '0', '100')(done);
    });
  });
  timeT = Date.now() - timeT;
  printResult('LRANGE 100', timeN, timeT);

  setTimeout(function() {
    process.exit();
  }, 100);
})();

function genTasks(count, task) {
  var tasks = [];
  while (count--) tasks.push(task);
  return tasks;
}
