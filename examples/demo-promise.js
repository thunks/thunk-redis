'use strict';
/*global */

var redis = require('../index');
var Bluebird = require('bluebird');
var client = redis.createClient({
  database: 1,
  usePromise: Bluebird
});

client.on('connect', function() {
  console.log('redis connected!');
});

client
  .info('server')
  .then(function(res) {
    console.log('redis server info:', res);
    return client.dbsize();
  })
  .then(function(res) {
    console.log('current database size:', res);
    // current database size: 0
    return client.select(0);
  })
  .then(function(res) {
    console.log('select database 0:', res);
    // select database 0: OK
    return Promise.all([
      client.multi(),
      client.set('key', 'redis'),
      client.get('key'),
      client.exec()
    ]);
  })
  .then(function(res) {
    console.log('transactions:', res);
    // transactions: [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'redis' ] ]
    return client.quit();
  })
  .then(function(res) {
    console.log('redis client quit:', res);
    // redis client quit: OK
  })
  .catch(function(err) {
    console.error(err);
  });
