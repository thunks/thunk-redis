'use strict';
/*global */

var redis = require('../index');
var Thunk = require('thunks')();
var client = redis.createClient({
  database: 1
});

client.on('connect', function() {
  console.log('redis connected!');
});

client.info('server')(function(error, res) {
  console.log('redis server info:', res);
  return this.dbsize();
})(function(error, res) {
  console.log('current database size:', res);
  // current database size: 0
  return this.select(0);
})(function(error, res) {
  console.log('select database 0:', res);
  // select database 0: OK
  return Thunk.all([
    this.multi(),
    this.set('key', 'redis'),
    this.get('key'),
    this.exec()
  ]);
})(function(error, res) {
  console.log('transactions:', res);
  // transactions: [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'redis' ] ]
  return this.quit();
})(function(error, res) {
  console.log('redis client quit:', res);
  // redis client quit: OK
});
