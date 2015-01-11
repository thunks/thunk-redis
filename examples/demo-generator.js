'use strict';
/*global */

var redis = require('../index');
var client = redis.createClient();

client.select(1)(function*(error, res) {
  console.log(error, res);

  yield this.set('foo', 'bar');
  yield this.set('bar', 'baz');

  console.log('foo -> %s', yield this.get('foo'));
  console.log('bar -> %s', yield this.get('bar'));

  var user = {
    id: 'u001',
    name: 'jay',
    age: 24
  };
  // transaction
  yield [
    this.multi(),
    this.set(user.id, JSON.stringify(user)),
    this.zadd('userAge', user.age, user.id),
    this.pfadd('ageLog', user.age),
    this.exec()
  ];

  return this.quit();
})(function(error, res) {
  console.log(error, res);
});
