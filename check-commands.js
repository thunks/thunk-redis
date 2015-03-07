'use strict';

/*jshint -W106*/

var redis = require('./index');
var cli = redis.createClient();

cli.info()(function* (err, info) {
  if (err) throw err;
  console.log('Version:', info.redis_version);

  var add = [], discard = [];
  var commands = yield cli.command();

  commands = commands.map(function(command) {
    return command[0];
  });

  // console.log(commands.sort());

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

  process.exit();
})();
