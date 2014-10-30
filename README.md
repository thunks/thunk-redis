thunk-redis v0.2.0 [![Build Status](https://travis-ci.org/zensh/thunk-redis.png?branch=master)](https://travis-ci.org/zensh/thunk-redis)
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

### Options

#### noDelay

*Optional*, Type: `Boolean`, Default: `true`.

Disables the Nagle algorithm. By default TCP connections use the Nagle algorithm, they buffer data before sending it off. Setting true for noDelay will immediately fire off data each time socket.write() is called.

#### keepAlive

*Optional*, Type: `Boolean`, Default: `true`.

Enable/disable keep-alive functionality, and optionally set the initial delay before the first keepalive probe is sent on an idle socket.

#### timeout

*Optional*, Type: `Number`, Default: `0`.

Sets the socket to timeout after timeout milliseconds of inactivity on the socket. If timeout is 0, then the existing idle timeout is disabled.

When an idle timeout is triggered the socket will receive a 'timeout' event but the connection will not be severed.

#### retryDelay

*Optional*, Type: `Number`, Default: `1000`.


#### maxAttempts

*Optional*, Type: `Number`, Default: `10`.


#### commandsHighWater

*Optional*, Type: `Number`, Default: `10000`.


#### authPass

*Optional*, Type: `String`, Default: `''`.


#### database

*Optional*, Type: `Number`, Default: `0`.


#### returnBuffers

*Optional*, Type: `Boolean`, Default: `false`.


### Events
1. client.on('error', function (error) {})
2. client.on('connect', function () {})
3. client.on('close', function () {})
4. client.on('end', function () {})
5. client.on('drain', function () {})
6. client.on('timeout', function () {})
