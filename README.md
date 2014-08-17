thunk-redis v0.0.4 [![Build Status](https://travis-ci.org/zensh/thunk-redis.png?branch=master)](https://travis-ci.org/zensh/thunk-redis)
===========
A thunk-based redis client.



## Demo

```js
var redis = require('thunk-redis');

var client = redis.createClient({database: 2});

client.on('connect', function () {
  console.log('redis connected!');
});
client.info()(function (error, res) {
  console.log(res);
  console.log(client.status);
});
```

## Installation

**Node.js:**

    npm install thunk-redis

## API

```js
var redis = require('thunk-redis');
```

### redis.createClient([port], [host], [options])
### redis.createClient([path], [options])

+ port: `Number`, default: `6379`;
+ host: `String`, default: `'localhost'`;
+ options: `Object`, default: `{}`;
+ path: `String`, default: `undefined`;

Create a redis client, return the client.

```js
var client1 = redis.createClient();
var client2 = redis.createClient({database: 2});
var client3 = redis.createClient(6379, {database: 2});
var client4 = redis.createClient(6379, '127.0.0.1', {database: 2});
var client5 = redis.createClient('/tmp/redis.sock');
var client6 = redis.createClient('/tmp/redis.sock', {database: 2});
```

### redis.log([...])

```js
var client = redis.createClient();
client.info()(redis.log);
```