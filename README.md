thunk-redis v0.1.2 [![Build Status](https://travis-ci.org/zensh/thunk-redis.png?branch=master)](https://travis-ci.org/zensh/thunk-redis)
===========
A thunk-based redis client with pipelining.



## Demo

```js
var redis = require('thunk-redis'),
  client = redis.createClient({
    database: 1
  });

client.on('connect', function () {
  console.log('redis connected!');
});

client.info('server')(function (error, res) {
  console.log('redis server info: ', res);
  console.log('redis client status: ', this.status);
  return this.dbsize();
})(function (error, res) {
  console.log('surrent database size: ', res);
  return this.select(0);
})(function (error, res) {
  console.log('select database 0: ', res);
  console.log('redis client status: ', this.status);
  this.end();
});
```

## Installation

**Node.js:**

    npm install thunk-redis

## API([More](https://github.com/zensh/thunk-redis/blob/master/API.md))

1. redis.createClient([port], [host], [options])
2. redis.createClient([path], [options])
3. redis.log([...])

### Events
1. client.on('error', function (error) {})
2. client.on('connect', function () {})
3. client.on('close', function () {})
4. client.on('end', function () {})
5. client.on('drain', function () {})
6. client.on('timeout', function () {})
