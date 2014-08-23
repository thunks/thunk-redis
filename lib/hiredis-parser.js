'use strict';

var undef,
  util = require('util'),
  hiredis = require('hiredis');

module.exports = ReplyParser;

function ReplyParser(returnBuffers) {
  this.reader = new hiredis.Reader({
    return_buffers: !!returnBuffers
  });
}

ReplyParser.prototype.exec = function (chunk) {
  var reply, n = 0;

  this.reader.feed(chunk);
  while (true) {
    chunk = this.reader.get();
    // if (++n > 1) console.log('::Hreply' + n, typeof chunk, chunk);
    if (chunk === undef) break;
    reply = chunk;
  }
  return reply;
};

