#!/usr/bin/env node
'use strict';

export interface SCResult {
  cpExitCode: number,
  originalPath: string,
  stderr: string,
  linkPath: string,
  isSymbolicLink: boolean,
  isDirectory: boolean
}


import util = require('util');
import fs = require('fs');

const {findProjectRoot} = require('residence');
const root = findProjectRoot(process.cwd());

if (!root) {
  throw new Error('no package.json file could be found given your current working directory.');
}

import chalk = require('chalk');
import path = require('path');
import async = require('async');
import cp = require('child_process');

const log = console.log.bind(console, chalk.cyan(' [symlink-city] '));
const logerror = console.error.bind(console, chalk.red(' [symlink-city-error] '));

let topLevelDirectories, nm = path.resolve(root + '/node_modules');

try {
  topLevelDirectories = fs.readdirSync(nm);
}
catch (err) {
  logerror(`could not find node_modules directory given perceived project root ${root}`);
  throw err;
}

let wrap = function (cb: Function, fn: Function) {
  return function (err: Error) {
    if (err) {
      return cb(err);
    }
    else {
      return fn.apply(this, Array.from(arguments).slice(1))
    }
  }
};

log(`${topLevelDirectories.length} files/folders found in 'node_modules' dir at path ${chalk.magenta(nm)}.`);

async.mapLimit(topLevelDirectories, 3, function (item, cb) {

  const rp = path.resolve(nm + '/' + item); // resolved path

  fs.lstat(rp, function (err, stats) {
    if (err) return cb(err);

    if (!stats.isSymbolicLink()) {
      cb(null, {
        originalPath: rp,
        isSymbolicLink: false
      });
    }
    else {

      log(`found a symlink here -> ${rp}.`);

      fs.readlink(rp, function (err, linkStr) {
        if (err) return cb(err);

        let rlp = path.resolve(nm + '/' +  linkStr);

        log(`We were able to resolve symlink`);
        log(`Original path -> ${chalk.magenta.dim(rp)} -> resolved to ->  ${chalk.magenta(rlp)}`);

        fs.stat(rlp, function (err, stats) {
          if (err) return cb(err);

          if (!stats.isDirectory()) {
            cb(null, {
              originalPath: rp,
              linkPath: rlp,
              isSymbolicLink: true,
              isDirectory: false
            });
          }
          else {

            log(`unlinking the symlink at ${rp}`);

            fs.unlink(rp, function (err) {
              if (err) return cb(err);

              log(`we are now copying contents of ${chalk.magenta(rlp)} to  ${chalk.magenta(rp)}`);

              const k = cp.spawn('bash');

              k.stdin.write('\n');
              k.stdin.write(`cp -r ${rlp} ${rp}`);

              process.nextTick(function () {
                k.stdin.end('\n');
              });

              let stderr = '';

              k.stderr.on('data', function (d) {
                stderr += String(d);
              });

              k.once('exit', function (code) {

                cb(null, {
                  cpExitCode: code,
                  originalPath: rp,
                  stderr: stderr,
                  linkPath: rlp,
                  isSymbolicLink: true,
                  isDirectory: false
                });

              });

            });

          }

        });

      });
    }

  });

}, function (err, results: Array<SCResult>) {

  if (err) {
    throw err;
  }

  const emptyStr = '';
  console.log(emptyStr);console.error(emptyStr);
  log(chalk.blue.bold('run has completed, here are the results:'));
  console.log(emptyStr); console.error(emptyStr);

  {

    let flip = true;

    results.filter(function (val) {
      return val.cpExitCode === 0;
    })
    .forEach(function ({originalPath, linkPath}) {
      flip && ((flip = false) || log('the following folders were successfully realized:'));
      log(util.inspect({originalPath, linkPath}))
    });

  }

  {

    let flip = true;

    results.filter(function (val) {
      return val.cpExitCode;
    })
    .forEach(function (val) {
      flip && ((flip = false) || log(chalk.bgRed('the following folders could not be successfully realized:')));
      log('\n', chalk.red(util.inspect(val)));
    });

  }

  {

    let flip = true;

    results.filter(function (val) {
      return !val.cpExitCode;
    })
    .forEach(function (val) {
      flip && ((flip = false) || log(chalk.yellow.bold('The following folders did not need to be realized:')));
      console.log('\n', util.inspect(val));
    });

  }

});






