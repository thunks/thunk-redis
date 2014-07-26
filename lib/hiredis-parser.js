'use strict';

var util = require('util'),
  hiredis = require('hiredis');

module.exports = ReplyParser;

function ReplyParser(returnBuffers) {
  this.reader = new hiredis.Reader({
    return_buffers: !!returnBuffers
  });
}

ReplyParser.prototype.exec = function (chunk) {
  var reply = '', n = 0;

  this.reader.feed(chunk);
  while (true) {
    chunk = this.reader.get();
    if (!chunk) break;
    reply = chunk;
    console.log('::Hreply' + n, typeof reply);
  }
  return reply;
};

