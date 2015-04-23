'use strict';
/*global */

var redis = require('../index');
var client = redis.createClient(7000, {debugMode: false});

client.info()(function*() {
  var res = yield [
    this.multi('key'),
    this.set('key', 'key'),
    this.get('key'),
    this.exec('key')
  ];
  console.log(res); // [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'key' ] ]

  // Keys hash tags
  res = yield [
    this.multi('hash{tag}'),
    this.set('hash{tag}', 'hash{tag}'),
    this.get('hash{tag}'),
    this.exec('hash{tag}')
  ];
  console.log(res); // [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'hash{tag}' ] ]

})();
