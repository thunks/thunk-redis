'use strict';
/*global */

var redis = require('../index');

var client = redis.createClient({database: 2});

client.on('connect', function () {
  console.log('redis connected!');
});
client.info()(function (error, res) {
  console.log(res);
  console.log(client.status);
});