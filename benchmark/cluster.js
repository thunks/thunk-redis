'use strict';

const assert = require('assert');
const Thunk = require('thunks')();
const redis = require('../index');
const IoRedis = require('ioredis');

Thunk(function*() {
  var timeT = 0;
  var timeI = 0;
  var testLen = 100000;
  var titleT = 'redis(T):';
  var titleI = 'redis(I):';
  var clientT = redis.createClient(7000);
  var clientI = new IoRedis.Cluster([
    {port: 7000, host: '127.0.0.1'},
    {port: 7001, host: '127.0.0.1'},
    {port: 7002, host: '127.0.0.1'}
  ]);

  var queue = [];
  while (queue.length < testLen) queue.push(queue.length);

  var smallStr = 'teambition';
  var longStr = (new Array(4097).join('-'));

  function printResult(title, timeT, timeI) {
    console.log(titleT, title, Math.floor(testLen * 1000 / timeT) + ' ops/sec', '100%');
    console.log(titleI, title, Math.floor(testLen * 1000 / timeI) + ' ops/sec', ((timeT / timeI) * 100).toFixed(1) + '%');
    console.log('');
  }

  console.log(titleT + 'thunk-redis\n', yield clientT.cluster('info'));
  // ioRedis cluster can't work (v1.0.6)
  console.log(titleI + 'ioRedis\n', yield function(done) { clientI.cluster('info', done); });
  console.log('Bench start:\n');

  var resT, resI;

  // SET
  yield Thunk.delay(100);

  timeT = Date.now();
  resT = yield queue.map(function() {
    return clientT.set('zensh_thunks_00000001', smallStr);
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  resI = yield queue.map(function() {
    return function(done) { clientI.set('zensh_thunks_00000001', smallStr, done); };
  });
  timeI = Date.now() - timeI;
  printResult('SET small string', timeT, timeI);

  resT.map(function(val) {
    assert.equal(val, 'OK');
  });
  resI.map(function(val) {
    assert.equal(val, 'OK');
  });

  // GET
  yield Thunk.delay(100);

  timeT = Date.now();
  resT = yield queue.map(function() {
    return clientT.get('zensh_thunks_00000001');
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  resI = yield queue.map(function() {
    return function(done) { clientI.get('zensh_thunks_00000001', done); };
  });
  timeI = Date.now() - timeI;
  printResult('GET small string', timeT, timeI);

  resT.map(function(val) {
    assert.equal(val, smallStr);
  });
  resI.map(function(val) {
    assert.equal(val, smallStr);
  });

  // SET
  yield Thunk.delay(100);

  timeT = Date.now();
  resT = yield queue.map(function() {
    return clientT.set('zensh_thunks_00000002', longStr);
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  resI = yield queue.map(function() {
    return function(done) { clientI.set('zensh_thunks_00000002', longStr, done); };
  });
  timeI = Date.now() - timeI;
  printResult('SET long string', timeT, timeI);

  resT.map(function(val) {
    assert.equal(val, 'OK');
  });
  resI.map(function(val) {
    assert.equal(val, 'OK');
  });

  // GET
  yield Thunk.delay(100);

  timeT = Date.now();
  resT = yield queue.map(function() {
    return clientT.get('zensh_thunks_00000002');
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  resI = yield queue.map(function() {
    return function(done) { clientI.get('zensh_thunks_00000002', done); };
  });
  timeI = Date.now() - timeI;
  printResult('GET long string', timeT, timeI);

  resT.map(function(val) {
    assert.equal(val, longStr);
  });
  resI.map(function(val) {
    assert.equal(val, longStr);
  });

  // INCR
  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.incr('zensh_thunks_00000003');
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return function(done) { clientI.incr('zensh_thunks_00000003', done); };
  });
  timeI = Date.now() - timeI;
  printResult('INCR', timeT, timeI);

  // LPUSH
  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.lpush('zensh_thunks_00000004', smallStr);
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return function(done) { clientI.lpush('zensh_thunks_00000004', smallStr, done); };
  });
  timeI = Date.now() - timeI;
  printResult('LPUSH', timeT, timeI);

  // LRANGE
  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.lrange('zensh_thunks_00000004', '0', '100');
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return function(done) { clientI.lrange('zensh_thunks_00000004', '0', '100', done); };
  });
  timeI = Date.now() - timeI;
  printResult('LRANGE 100', timeT, timeI);

  yield Thunk.delay(100);
  process.exit();
})();
