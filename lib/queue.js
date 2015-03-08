'use strict';

module.exports = Queue;

function Queue() {
  this.tail = [];
  this.head = [];
  this.offset = 0;
  this.hLength = 0;
}

Queue.prototype.first = function() {
  var item = this.shift();
  if (this.offset > 0) this.offset--;
  return item;
};

Queue.prototype.shift = function() {
  if (this.offset === this.hLength) {
    var tmp = this.head;
    tmp.length = 0;
    this.head = this.tail;
    this.tail = tmp;
    this.offset = 0;
    this.hLength = this.head.length;
    if (!this.hLength) return;
  }
  return this.head[this.offset++];
};

Queue.prototype.push = function(item) {
  this.tail.push(item);
};

Queue.prototype.unshift = function(item) {
  if (!this.offset) {
    this.hLength++;
    this.head.unshift(item);
  } else {
    this.offset--;
    this.head[this.offset] = item;
  }
};

Object.defineProperty(Queue.prototype, 'length', {
  get: function() {
    return this.hLength + this.tail.length - this.offset;
  }
});
