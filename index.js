#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("util");
var fs = require("fs");
var findProjectRoot = require('residence').findProjectRoot;
var root = findProjectRoot(process.cwd());
if (!root) {
    throw new Error('no package.json file could be found given your current working directory.');
}
var chalk = require("chalk");
var path = require("path");
var async = require("async");
var cp = require("child_process");
var log = console.log.bind(console, chalk.cyan(' [symlink-city] '));
var logerror = console.error.bind(console, chalk.red(' [symlink-city-error] '));
var topLevelDirectories, nm = path.resolve(root + '/node_modules');
try {
    topLevelDirectories = fs.readdirSync(nm);
}
catch (err) {
    logerror("could not find node_modules directory given perceived project root " + root);
    throw err;
}
var wrap = function (cb, fn) {
    return function (err) {
        if (err) {
            return cb(err);
        }
        else {
            return fn.apply(this, Array.from(arguments).slice(1));
        }
    };
};
console.log('\n');
log('symlink-city is starting a new run.');
log(topLevelDirectories.length + " files/folders found in 'node_modules' dir at path " + chalk.magenta(nm) + ".");
async.mapLimit(topLevelDirectories, 3, function (item, cb) {
    var rp = path.resolve(nm + '/' + item);
    fs.lstat(rp, function (err, stats) {
        if (err)
            return cb(err);
        if (!stats.isSymbolicLink()) {
            cb(null, {
                originalPath: rp,
                isSymbolicLink: false
            });
        }
        else {
            log("found a symlink here -> " + rp + ".");
            fs.readlink(rp, function (err, linkStr) {
                if (err)
                    return cb(err);
                var rlp = path.isAbsolute(linkStr) ? linkStr : path.resolve(nm + '/' + linkStr);
                log("We were able to resolve symlink");
                log("Original path -> " + chalk.magenta.dim(rp) + " -> resolved to ->  " + chalk.magenta(rlp));
                fs.stat(rlp, function (err, stats) {
                    if (err)
                        return cb(err);
                    if (!stats.isDirectory()) {
                        cb(null, {
                            originalPath: rp,
                            linkPath: rlp,
                            isSymbolicLink: true,
                            isDirectory: false
                        });
                    }
                    else {
                        log("unlinking the symlink at " + chalk.yellow(rp));
                        fs.unlink(rp, function (err) {
                            if (err)
                                return cb(err);
                            log("we are now linking " + chalk.magenta(rlp) + " to  " + chalk.magenta(rp));
                            var k = cp.spawn('bash');
                            k.stdin.write('\n');
                            k.stdin.write("hln " + rlp + " " + rp);
                            process.nextTick(function () {
                                k.stdin.end('\n');
                            });
                            var stderr = '';
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
}, function (err, results) {
    if (err) {
        throw err;
    }
    var emptyStr = '';
    console.log(emptyStr);
    console.error(emptyStr);
    log(chalk.blue.bold('run has completed, here are the results:'));
    console.log(emptyStr);
    console.error(emptyStr);
    {
        var flip_1 = true;
        results.filter(function (val) {
            return val.cpExitCode === 0;
        })
            .forEach(function (_a) {
            var originalPath = _a.originalPath, linkPath = _a.linkPath;
            flip_1 && ((flip_1 = false) || log('the following folders were successfully realized:'));
            log(util.inspect({ originalPath: originalPath, linkPath: linkPath }));
        });
    }
    {
        var flip_2 = true;
        results.filter(function (val) {
            return val.cpExitCode;
        })
            .forEach(function (val) {
            flip_2 && ((flip_2 = false) || log(chalk.bgRed('the following folders could not be successfully realized:')));
            log('\n', chalk.red(util.inspect(val)));
        });
    }
    {
        var flip_3 = true;
        results.filter(function (val) {
            return !val.cpExitCode;
        })
            .forEach(function (val) {
            flip_3 && ((flip_3 = false) || log(chalk.yellow.bold('The following folders did not need to be realized:')));
            console.log('\n', util.inspect(val));
        });
    }
});
