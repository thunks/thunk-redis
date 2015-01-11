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
    console.log('surrent database size:', res);
    return client.select(0);
  })
  .then(function(res) {
    console.log('select database 0:', res);
    return client.quit();
  })
  .then(function(res) {
    console.log('redis client quit:', res);
  })
  .catch(function(err) {
    console.error(err);
  });
