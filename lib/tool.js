'use strict';

var hasOwn = Object.prototype.hasOwnProperty;

exports.setPrivate = function(ctx, key, value) {
  Object.defineProperty(ctx, key, {
    value: value,
    writable: false,
    enumerable: false,
    configurable: false
  });
};

exports.slice = function(args, start) {
  start = start || 0;
  if (start >= args.length) return [];
  var len = args.length, ret = Array(len - start);
  while (len-- > start) ret[len - start] = args[len];
  return ret;
};

exports.log = function() {
  console.log.apply(console, arguments);
};

exports.each = function(obj, iterator, context, arrayLike) {
  var i, l, key;

  if (!obj) return;
  if (arrayLike == null) arrayLike = Array.isArray(obj);
  if (arrayLike) {
    for (i = 0, l = obj.length; i < l; i++) iterator.call(context, obj[i], i, obj);
  } else {
    for (key in obj) {
      if (hasOwn.call(obj, key)) iterator.call(context, obj[key], key, obj);
    }
  }
};

exports.Queue = Queue;

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
  return this.tail.push(item);
};

Object.defineProperty(Queue.prototype, 'length', {
  get: function() {
    return this.hLength + this.tail.length - this.offset;
  }
});
