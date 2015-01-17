'use strict';

var db = require('db');
var coroutine = require('coroutine');
var dbs = "redis://127.0.0.1";
var client = db.open(dbs);

var titleF = 'redis@fibjs:';
var time = 0;
var testLen = 1000;
var smallStr = 'teambition';
var longStr = (new Array(4097).join('-'));

console.log(titleF, client.command('flushdb').toString());
console.log('Start...\n\n');

// PING
time = Date.now();
coroutine.parallel(genTasks(testLen, function() {
  client.command('ping').toString();
}));
printResult('PING', Date.now() - time);

// SET
time = Date.now();
coroutine.parallel(genTasks(testLen, function() {
  client.command('set', 'zensh_thunks_00000001', smallStr).toString();
}));
printResult('SET', Date.now() - time);

// GET
time = Date.now();
coroutine.parallel(genTasks(testLen, function() {
  client.command('get', 'zensh_thunks_00000001').toString();
}));
printResult('GET', Date.now() - time);

// SET
time = Date.now();
coroutine.parallel(genTasks(testLen, function() {
  client.command('set', 'zensh_thunks_00000002', longStr).toString();
}));
printResult('SET', Date.now() - time);

// GET
time = Date.now();
coroutine.parallel(genTasks(testLen, function() {
  client.command('get', 'zensh_thunks_00000002').toString();
}));
printResult('GET', Date.now() - time);

// INCR
time = Date.now();
coroutine.parallel(genTasks(testLen, function() {
  client.command('incr', 'zensh_thunks_00000003').toString();
}));
printResult('INCR', Date.now() - time);

// LPUSH
time = Date.now();
coroutine.parallel(genTasks(testLen, function() {
  client.command('lpush', 'zensh_thunks_00000004', smallStr).toString();
}));
printResult('LPUSH', Date.now() - time);

// LRANGE
time = Date.now();
coroutine.parallel(genTasks(testLen, function() {
  client.command('lrange', 'zensh_thunks_00000004', '0', '100').toString();
}));
printResult('LRANGE 100', Date.now() - time);

function genTasks(count, task) {
  var tasks = [];
  while (count--) tasks.push(task);
  return tasks;
}

function printResult(title, time) {
  console.log(titleF, title, Math.floor(testLen * 1000 / time) + ' ops/sec');
  console.log('');
}
