'use strict'

module.exports = class Queue {
  constructor () {
    this.tail = []
    this.head = []
    this.offset = 0
    this.hLength = 0
  }

  get length () {
    return this.hLength + this.tail.length - this.offset
  }

  first () {
    return this.hLength === this.offset ? this.tail[0] : this.head[this.offset]
  }

  push (item) {
    this.tail.push(item)
  }

  pop () {
    if (this.tail.length) return this.tail.pop()
    if (!this.hLength) return
    this.hLength--
    return this.head.pop()
  }

  unshift (item) {
    if (!this.offset) {
      this.hLength++
      this.head.unshift(item)
    } else {
      this.offset--
      this.head[this.offset] = item
    }
  }

  shift () {
    if (this.offset === this.hLength) {
      if (!this.tail.length) return

      let tmp = this.head
      tmp.length = 0
      this.head = this.tail
      this.tail = tmp
      this.offset = 0
      this.hLength = this.head.length
    }
    return this.head[this.offset++]
  }

  migrateTo (queue) {
    let i = this.offset
    let len = this.tail.length
    while (i < this.hLength) queue.push(this.head[i++])

    i = 0
    while (i < len) queue.push(this.tail[i++])
    this.offset = this.hLength = this.head.length = this.tail.length = 0
    return queue
  }
}
