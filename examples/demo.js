'use strict';
/*global */

var redis = require('../index');

var client = redis.createClient({database: 1});

client.on('connect', function () {
  console.log('redis connected!');
});
client.info()(function (error, res) {
  console.log(res);
  console.log(this.status);
  this.end();
});