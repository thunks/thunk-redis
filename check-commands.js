#!/usr/bin/env node

'use strict';

/*jshint -W106*/

var redis = require('./index');
var cli = redis.createClient(7000);

cli.info()(function* (err, info) {
  if (err) throw err;
  console.log('Version:', info.redis_version);

  var add = [], discard = [], commandsInfo = {};
  var commands = yield cli.command();

  commands = commands.map(function(command) {
    commandsInfo[command[0]] = command.slice(1);
    return command[0];
  });

  commands.reduce(function(add, command) {
    if (cli.clientCommands.indexOf(command) === -1) add.push(command);
    return add;
  }, add);
  console.log('Add:', add);

  cli.clientCommands.reduce(function(discard, command) {
    if (commands.indexOf(command) === -1) discard.push(command);
    return discard;
  }, discard);
  console.log('Discard:', discard);

  info = {};
  Object.keys(commandsInfo).sort().forEach(function(command) {
    info[command] = commandsInfo[command];
  });
  console.log(info);

  process.exit();
})();
