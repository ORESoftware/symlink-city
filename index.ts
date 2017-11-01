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

import os = require('os');

let isWin = os.platform() === 'win32';
if (isWin) {
  console.error(' => symlink-city is not designed to work for Windows, only MacOS and *nix.');
  process.exit(1);
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

console.log('\n');
log('symlink-city is starting a new run.');
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

        let rlp = path.isAbsolute(linkStr) ? linkStr : path.resolve(nm + '/' + linkStr);
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

            log(`unlinking the symlink at ${chalk.yellow(rp)}`);

            fs.unlink(rp, function (err) {
              if (err) return cb(err);

              log(`we are now linking ${chalk.magenta(rlp)} to  ${chalk.magenta(rp)}`);

              const k = cp.spawn('bash');

              k.stdin.write('\n');

              // k.stdin.write(`ln ${rlp} ${rp}`);
              let exclude = path.resolve(rlp + '/node_modules');
              console.log('excluded dir => ', exclude);
              console.log('source dir => ', rlp);
              console.log('dest dir => ', rp);

              // k.stdin.write('shopt -s extglob;\n');
              // k.stdin.write(`cp -R !(node_modules/*) ${rlp} ${rp} `);
              // k.stdin.write(`cp -r ${rlp} ${rp} `);

              k.stdin.write(`rsync -a --exclude=${exclude} ${rlp + '/*'} ${rp} `);
              //
              // k.stdin.write('echo "dummy"')

              process.nextTick(function () {
                k.stdin.end('\n');
              });

              let stderr = '';

              k.stderr.on('data', function (d) {
                stderr += String(d);
              });

              k.once('exit', function (code) {

                console.log('exit code => ', code);
                console.log('stderr => ', stderr);

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
  console.log(emptyStr);
  console.error(emptyStr);
  log(chalk.blue.bold('run has completed, here are the results:'));
  console.log(emptyStr);
  console.error(emptyStr);

  {

    let flip = true;

    results.filter(function (val) {
      return val.cpExitCode === 0;
    })
    .forEach(function ({originalPath, linkPath}) {
      flip && ((flip = false) || log('the following folders were successfully realized:'));
      log(util.inspect({originalPath, linkPath}))
    });

    if (flip) {
      log(chalk.red('no symlinks were successfully converted to hardlinks.'));
    }

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

    let noNeed = results.filter(function (val) {
      return !('cpExitCode' in val);
    });

    log(chalk.bold(`${noNeed.length} folders were not symlinks.`));

  }

});






