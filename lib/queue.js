/**
 * thunk-redis - https://github.com/thunks/thunk-redis
 *
 * MIT Licensed
 */

module.exports = Queue

function Queue () {
  this.tail = []
  this.head = []
  this.offset = 0
  this.hLength = 0
}

Queue.prototype.first = function () {
  return this.hLength === this.offset ? this.tail[0] : this.head[this.offset]
}

Queue.prototype.push = function (item) {
  this.tail.push(item)
}

Queue.prototype.pop = function () {
  if (this.tail.length) return this.tail.pop()
  if (!this.hLength) return
  this.hLength--
  return this.head.pop()
}

Queue.prototype.unshift = function (item) {
  if (!this.offset) {
    this.hLength++
    this.head.unshift(item)
  } else {
    this.offset--
    this.head[this.offset] = item
  }
}

Queue.prototype.shift = function () {
  if (this.offset === this.hLength) {
    if (!this.tail.length) return

    var tmp = this.head
    tmp.length = 0
    this.head = this.tail
    this.tail = tmp
    this.offset = 0
    this.hLength = this.head.length
  }
  return this.head[this.offset++]
}

Queue.prototype.migrateTo = function (queue) {
  var i = this.offset
  var len = this.tail.length
  while (i < this.hLength) queue.push(this.head[i++])

  i = 0
  while (i < len) queue.push(this.tail[i++])
  this.offset = this.hLength = this.head.length = this.tail.length = 0
  return queue
}

Object.defineProperty(Queue.prototype, 'length', {
  get: function () {
    return this.hLength + this.tail.length - this.offset
  }
})
