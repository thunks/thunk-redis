'use strict'

const tman = require('tman')
const assert = require('assert')
const thunks = require('thunks')
const redis = require('..')

module.exports = function () {
  tman.suite('chaos test', function () {
    let thunk = thunks(function (err) {
      throw err
    })
    let client = redis.createClient()
    let clientP = redis.createClient({
      usePromise: true
    })
    let len = 10000
    let tasks = []
    for (let i = 0; i < len; i++) tasks.push(i)

    function getClient () {
      // use thunk API or promise API randomly
      return Math.floor(Math.random() * 10) % 2 ? client : clientP
    }

    tman.it('create 10000 users', function * () {
      assert((yield client.flushall()) === 'OK')
      yield tasks.map(function (value, index) {
        return createUser('U' + index)
      })
      assert((yield client.zcard('userScore')) === len)

      function * createUser (id) {
        let cli = getClient()
        let time = Date.now()
        let user = {
          id: id,
          name: 'user_' + id,
          email: id + '@test.com',
          score: 0,
          issues: [],
          createdAt: time,
          updatedAt: time
        }

        yield thunk.delay(Math.floor(Math.random() * 5))
        let result = yield [
          cli.multi(),
          cli.set(id, JSON.stringify(user)),
          cli.zadd('userScore', user.score, id),
          cli.exec()
        ]
        assert.deepEqual(result, ['OK', 'QUEUED', 'QUEUED', ['OK', 1]])
      }
    })

    tman.it('update 10000 users', function * () {
      yield tasks.map(function (value, index) {
        return updateUser('U' + index, Math.floor(Math.random() * 1000))
      })

      assert((yield client.pfcount('scoreLog')) > 5)

      function * updateUser (id, score) {
        let cli = getClient()
        let user = yield cli.get(id)
        user = JSON.parse(user)
        user.score = score
        user.updatedAt = Date.now()
        let result = yield [
          cli.multi(),
          cli.set(id, JSON.stringify(user)),
          cli.zadd('userScore', user.score, id),
          cli.pfadd('scoreLog', Math.floor(score / 100)),
          cli.exec()
        ]
        result.pop()
        assert.deepEqual(result, ['OK', 'QUEUED', 'QUEUED', 'QUEUED'])
      }
    })

    tman.it('create 10000 issues for some users', function * () {
      yield tasks.map(function (value, index) {
        return createIssue('I' + index, 'U' + Math.floor(Math.random() * len))
      })

      assert((yield client.pfcount('scoreLog')) > 5)

      function * createIssue (id, uid) {
        let cli = getClient()
        let time = Date.now()
        let issue = {
          id: id,
          creatorId: uid,
          content: 'issue_' + id,
          createdAt: time,
          updatedAt: time
        }

        let user = JSON.parse(yield cli.get(uid))
        if (!user) {
          console.log(uid, user)
          return
        }
        user.issues.push(issue.id)
        user.score += 100
        user.updatedAt = time

        let result = yield [
          cli.multi(),
          cli.hmset(id, {
            issue: JSON.stringify(issue),
            creator: JSON.stringify({
              id: user.id,
              name: user.name,
              email: user.email
            })
          }),
          cli.set(uid, JSON.stringify(user)),
          cli.zadd('userScore', user.score, uid),
          cli.pfadd('scoreLog', Math.floor(user.score / 100)),
          cli.exec()
        ]
        result.pop()
        assert.deepEqual(result, ['OK', 'QUEUED', 'QUEUED', 'QUEUED', 'QUEUED'])
      }
    })
  })
}
