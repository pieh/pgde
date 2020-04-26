#!/usr/bin/env node

const yargs = require(`yargs`);

const { activity, full, clean, $0, _: gatsbyCmd, ...args } = yargs.argv;

if (gatsbyCmd.length === 0 || gatsbyCmd[0] === `view`) {
  require(`./view`)();
} else {
  const runGatsby = require(`./run-gatsby`);
  try {
    runGatsby({
      activity,
      profileEverything: full,
      clean,
      $0,
      _: gatsbyCmd,
      ...args,
    });
  } catch (e) {
    console.debug(e);
  }
}
