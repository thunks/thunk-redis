'use strict';

const Thunk = require('thunks')();
const redis = require('../index');
const nodeRedis = require('redis');
const IoRedis = require('ioredis');

Thunk(function*() {
  var timeN = 0;
  var timeT = 0;
  var timeI = 0;
  var testLen = 100000;
  var titleN = 'redis(N):';
  var titleT = 'redis(T):';
  var titleI = 'redis(I):';
  var clientN = nodeRedis.createClient(6380);
  var clientT = redis.createClient(6381);
  var clientI = new IoRedis(6382);

  var queue = [];
  while (queue.length < testLen) queue.push(queue.length);

  var smallStr = 'teambition';
  var longStr = (new Array(4097).join('-'));

  function printResult(title, timeN, timeT, timeI) {
    console.log(titleN, title, Math.floor(testLen * 1000 / timeN) + ' ops/sec', '100%');
    console.log(titleT, title, Math.floor(testLen * 1000 / timeT) + ' ops/sec', ((timeN / timeT) * 100).toFixed(1) + '%');
    console.log(titleI, title, Math.floor(testLen * 1000 / timeI) + ' ops/sec', ((timeN / timeI) * 100).toFixed(1) + '%');
    console.log('');
  }

  console.log(titleN + 'node_redis ', yield function(done) { clientN.flushdb(done);});
  console.log(titleT + 'thunk-redis ', yield clientT.flushdb());
  console.log(titleI + 'ioRedis ', yield clientI.flushdb());
  console.log('Bench start:\n');

  // PING
  yield Thunk.delay(100);

  timeN = Date.now();
  yield queue.map(function() {
    return function(done) { clientN.ping(done); };
  });
  timeN = Date.now() - timeN;

  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.ping();
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return clientI.ping();
  });
  timeI = Date.now() - timeI;
  printResult('PING', timeN, timeT, timeI);

  // SET
  yield Thunk.delay(100);

  timeN = Date.now();
  yield queue.map(function() {
    return function(done) { clientN.set('zensh_thunks_00000001', smallStr, done); };
  });
  timeN = Date.now() - timeN;

  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.set('zensh_thunks_00000001', smallStr);
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return clientI.set('zensh_thunks_00000001', smallStr);
  });
  timeI = Date.now() - timeI;
  printResult('SET small string', timeN, timeT, timeI);

  // GET
  yield Thunk.delay(100);

  timeN = Date.now();
  yield queue.map(function() {
    return function(done) { clientN.get('zensh_thunks_00000001', done); };
  });
  timeN = Date.now() - timeN;

  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.get('zensh_thunks_00000001');
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return clientI.get('zensh_thunks_00000001');
  });
  timeI = Date.now() - timeI;
  printResult('GET small string', timeN, timeT, timeI);

  // SET
  yield Thunk.delay(100);

  timeN = Date.now();
  yield queue.map(function() {
    return function(done) { clientN.set('zensh_thunks_00000002', longStr, done); };
  });
  timeN = Date.now() - timeN;

  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.set('zensh_thunks_00000002', longStr);
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return clientI.set('zensh_thunks_00000002', longStr);
  });
  timeI = Date.now() - timeI;
  printResult('SET long string', timeN, timeT, timeI);

  // GET
  yield Thunk.delay(100);

  timeN = Date.now();
  yield queue.map(function() {
    return function(done) { clientN.get('zensh_thunks_00000002', done); };
  });
  timeN = Date.now() - timeN;

  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.get('zensh_thunks_00000002');
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return clientI.get('zensh_thunks_00000002');
  });
  timeI = Date.now() - timeI;
  printResult('GET long string', timeN, timeT, timeI);

  // INCR
  yield Thunk.delay(100);

  timeN = Date.now();
  yield queue.map(function() {
    return function(done) { clientN.incr('zensh_thunks_00000003', done); };
  });
  timeN = Date.now() - timeN;

  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.incr('zensh_thunks_00000003');
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return clientI.incr('zensh_thunks_00000003');
  });
  timeI = Date.now() - timeI;
  printResult('INCR', timeN, timeT, timeI);

  // LPUSH
  yield Thunk.delay(100);

  timeN = Date.now();
  yield queue.map(function() {
    return function(done) { clientN.lpush('zensh_thunks_00000004', smallStr, done); };
  });
  timeN = Date.now() - timeN;

  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.lpush('zensh_thunks_00000004', smallStr);
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return clientI.lpush('zensh_thunks_00000004', smallStr);
  });
  timeI = Date.now() - timeI;
  printResult('LPUSH', timeN, timeT, timeI);

  // LRANGE
  yield Thunk.delay(100);

  timeN = Date.now();
  yield queue.map(function() {
    return function(done) { clientN.lrange('zensh_thunks_00000004', '0', '100', done); };
  });
  timeN = Date.now() - timeN;

  yield Thunk.delay(100);

  timeT = Date.now();
  yield queue.map(function() {
    return clientT.lrange('zensh_thunks_00000004', '0', '100');
  });
  timeT = Date.now() - timeT;

  yield Thunk.delay(100);

  timeI = Date.now();
  yield queue.map(function() {
    return clientI.lrange('zensh_thunks_00000004', '0', '100');
  });
  timeI = Date.now() - timeI;
  printResult('LRANGE 100', timeN, timeT, timeI);

  yield Thunk.delay(100);
  process.exit();
})();
