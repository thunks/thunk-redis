thunk-redis v0.1.0 [![Build Status](https://travis-ci.org/zensh/thunk-redis.png?branch=master)](https://travis-ci.org/zensh/thunk-redis)
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

## API([detail](https://github.com/zensh/thunk-redis/blob/master/API.md))

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
7. client.on('drain', function () {})
8. client.on('all', function (e) {})

### Key
1. client.del
1. client.dump
1. client.exists
1. client.expire
1. client.expireat
1. client.keys
1. client.migrate
1. client.move
1. client.object
1. client.persist
1. client.pexpire
1. client.pexpireat
1. client.pttl
1. client.randomkey
1. client.rename
1. client.renamenx
1. client.restore
1. client.sort
1. client.ttl
1. client.type
1. client.scan

### String
1. client.append
1. client.bitcount
1. client.bitop
1. client.decr
1. client.decrby
1. client.get
1. client.getbit
1. client.getrange
1. client.getset
1. client.incr
1. client.incrby
1. client.incrbyfloat
1. client.mget
1. client.mset
1. client.msetnx
1. client.psetex
1. client.set
1. client.setbit
1. client.setex
1. client.setnx
1. client.setrange
1. client.strlen

### Hash
1. client.hdel
1. client.hexists
1. client.hget
1. client.hgetall
1. client.hincrby
1. client.hincrbyfloat
1. client.hkeys
1. client.hlen
1. client.hmget
1. client.hmset
1. client.hset
1. client.hsetnx
1. client.hvals
1. client.hscan

### List
1. client.blpop
1. client.brpop
1. client.brpoplpush
1. client.lindex
1. client.linsert
1. client.llen
1. client.lpop
1. client.lpush
1. client.lpushx
1. client.lrange
1. client.lrem
1. client.lset
1. client.ltrim
1. client.rpop
1. client.rpoplpush
1. client.rpush
1. client.rpushx

### Set
1. client.sadd
1. client.scard
1. client.sdiff
1. client.sdiffstore
1. client.sinter
1. client.sinterstore
1. client.sismember
1. client.smembers
1. client.smove
1. client.spop
1. client.srandmember
1. client.srem
1. client.sunion
1. client.sunionstore
1. client.sscan

### Sorted Set
1. client.zadd
1. client.zcard
1. client.zcount
1. client.zincrby
1. client.zinterstore
1. client.zrange
1. client.zrangebyscore
1. client.zrank
1. client.zrem
1. client.zremrangebyrank
1. client.zremrangebyscore
1. client.zrevrange
1. client.zrevrangebyscore
1. client.zrevrank
1. client.zscore
1. client.zunionstore
1. client.zsan

### Pubsub
1. client.psubscribe
1. client.publish
1. client.pubsub
1. client.punsubscribe
1. client.subscribe
1. client.unsubscribe

### Transaction
1. client.discard
1. client.exec
1. client.multi
1. client.unwatch
1. client.watch

### Script
1. client.eval
1. client.evalsha
1. client.script

### Connection
1. client.auth
1. client.echo
1. client.ping
1. client.quit
1. client.select

### Server
1. client.bgrewriteaof
1. client.bgsave
1. client.client
1. client.config
1. client.dbsize
1. client.debug
1. client.flushall
1. client.flushdb
1. client.info
1. client.lastsave
1. client.monitor
1. client.psync
1. client.save
1. client.shutdown
1. client.slaveof
1. client.slowlog
1. client.sync
1. client.time

### Others
1. client.unref()
1. client.emit()
1. client.end()
1. client.options
1. client.status
