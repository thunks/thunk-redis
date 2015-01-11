'use strict';
/*global */

var redis = require('../index');
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
  console.log('surrent database size:', res);
  return this.select(0);
})(function(error, res) {
  console.log('select database 0:', res);
  return this.quit();
})(function(error, res) {
  console.log('redis client quit:', res);
});
