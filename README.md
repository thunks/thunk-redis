thunk-redis
==========
A redis client with pipelining, rely on thunks, support promise.

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Talk topic][talk-image]][talk-url]

## [thunks](https://github.com/thunks/thunks)

## Demo([examples](https://github.com/zensh/thunk-redis/blob/master/examples))

**default thunk API:**

```js
var redis = require('thunk-redis');
var client = redis.createClient({
  database: 0
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
```

**use promise API:**
```js
var redis = require('thunk-redis');
var client = redis.createClient({
  database: 1,
  usePromise: true
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
  });
```

**support generator in thunk API:**
```js
var redis = require('thunk-redis');
var client = redis.createClient();

client.select(1)(function*(error, res) {
  console.log(error, res);

  yield this.set('foo', 'bar');
  yield this.set('bar', 'baz');

  console.log('foo -> %s', yield this.get('foo'));
  console.log('bar -> %s', yield this.get('bar'));

  return this.quit();
})(function(error, res) {
  console.log(error, res);
});
```

## Installation

**Node.js:**

```bash
npm install thunk-redis
```

## API([More](https://github.com/zensh/thunk-redis/blob/master/API.md))

1. redis.createClient([port], [host], [options])
2. redis.createClient([path], [options])
3. redis.log([...])

### Options

#### authPass

*Optional*, Type: `String`, Default: `''`.


#### database

*Optional*, Type: `Number`, Default: `0`.


#### returnBuffers

*Optional*, Type: `Boolean`, Default: `false`.

#### usePromise

*Optional*, Type: `Boolean` or `Promise` constructor, Default: `false`.

Export promise commands API.

**Use default Promise:**
```js
var redis = require('thunk-redis');
var client = redis.createClient({
  database: 1,
  usePromise: true
});
```

**Use bluebird:**
```js
var redis = require('thunk-redis');
var Bluebird = require('bluebird');
var client = redis.createClient({
  database: 1,
  usePromise: Bluebird
});
```

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

*Optional*, Type: `Number`, Default: `5000`.


#### maxAttempts

*Optional*, Type: `Number`, Default: `5`.


#### commandsHighWater

*Optional*, Type: `Number`, Default: `10000`.


[npm-url]: https://npmjs.org/package/thunk-redis
[npm-image]: http://img.shields.io/npm/v/thunk-redis.svg

[travis-url]: https://travis-ci.org/thunks/thunk-redis
[travis-image]: http://img.shields.io/travis/thunks/thunk-redis.svg

[talk-url]: https://guest.talk.ai/rooms/d1ccbf802n
[talk-image]: https://img.shields.io/talk/t/d1ccbf802n.svg
