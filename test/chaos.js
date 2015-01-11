'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/
/*jshint -W061*/
var assert = require('assert');
var thunks = require('thunks');
var redis = require('../index');

module.exports = function() {
  describe('chaos test', function() {
    var Thunk = thunks(function(err) {
      throw err;
    });
    var client = redis.createClient();
    var clientP = redis.createClient({
      usePromise: true
    });
    var len = 10000;
    var tasks = [];
    for (var i = 0; i < len; i++) tasks.push(i);

    function getClient() {
      // use thunk API or promise API randomly
      return Math.floor(Math.random() * 10) % 2 ? client : clientP;
    }

    it('create 10000 users', function(done) {
      client.flushall()(function*(err, res) {
        assert(res === 'OK');

        yield tasks.map(function(value, index) {
          return createUser('U' + index);
        });
        assert((yield client.zcard('userScore')) === len);
      })(done);

      function* createUser(id) {
        var cli = getClient();
        var time = Date.now();
        var user = {
          id: id,
          name: 'user_' + id,
          email: id + '@test.com',
          score: 0,
          issues: [],
          createdAt: time,
          updatedAt: time
        };

        yield Thunk.delay(Math.floor(Math.random() * 5));
        var result = yield [
          cli.multi(),
          cli.set(id, JSON.stringify(user)),
          cli.zadd('userScore', user.score, id),
          cli.exec()
        ];
        assert.deepEqual(result, ['OK', 'QUEUED', 'QUEUED', ['OK', 1]]);
      }
    });

    it('update 10000 users', function(done) {
      Thunk(function*() {
        yield tasks.map(function(value, index) {
          return updateUser('U' + index, Math.floor(Math.random() * 1000));
        });

        assert((yield client.pfcount('scoreLog')) > 5);
      })(done);

      function* updateUser(id, score) {
        var cli = getClient();
        var user = JSON.parse(yield cli.get(id));
        user.score = score;
        user.updatedAt = Date.now();
        var result = yield [
          cli.multi(),
          cli.set(id, JSON.stringify(user)),
          cli.zadd('userScore', user.score, id),
          cli.pfadd('scoreLog', Math.floor(score / 100)),
          cli.exec()
        ];
        result.pop();
        assert.deepEqual(result, ['OK', 'QUEUED', 'QUEUED', 'QUEUED']);
      }
    });

    it('create 10000 issues for some users', function(done) {
      Thunk(function*(err, res) {
        yield tasks.map(function(value, index) {
          return createIssue('I' + i, 'U' + Math.floor(Math.random() * len));
        });

        assert((yield client.pfcount('scoreLog')) > 5);
      })(done);

      function* createIssue(id, uid) {
        var cli = getClient();
        var time = Date.now();
        var issue = {
          id: id,
          creatorId: uid,
          content: 'issue_' + id,
          createdAt: time,
          updatedAt: time
        };

        var user = JSON.parse(yield cli.get(uid));
        if (!user) {
          console.log(uid, user);
          return;
        }
        user.issues.push(issue.id);
        user.score += 100;
        user.updatedAt = time;

        var result = yield [
          cli.multi(),
          cli.hmset(id, {
            issue: JSON.stringify(issue),
            creator: JSON.stringify({
              id: user.id,
              name: user.name,
              email: user.email
            }),
          }),
          cli.set(uid, JSON.stringify(user)),
          cli.zadd('userScore', user.score, uid),
          cli.pfadd('scoreLog', Math.floor(user.score / 100)),
          cli.exec()
        ];
        result.pop();
        assert.deepEqual(result, ['OK', 'QUEUED', 'QUEUED', 'QUEUED', 'QUEUED']);
      }
    });

  });
};
