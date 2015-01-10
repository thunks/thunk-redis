'use strict';

exports.setPrivate = function(ctx, key, value) {
  Object.defineProperty(ctx, key, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: value
  });
};

exports.slice = function(args, start) {
  start = start || 0;
  if (start >= args.length) return [];
  var len = args.length,
    ret = Array(len - start);
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
      if (obj.hasOwnProperty(key)) iterator.call(context, obj[key], key, obj);
    }
  }
};
