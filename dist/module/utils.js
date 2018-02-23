'use strict';

var async = require('async');
var childProcess = require('child_process');
var fs = require('fs');

var utils = module.exports = {};

utils.labelPullRequestWithMetricMovement = require('./labelPullRequestWithMetricMovement');

var credentials = '-u "' + process.env.GITHUB_USER + ':' + process.env.GITHUB_API_TOKEN + '"';

utils.version = process.env.npm_package_version;
utils.versionTag = 'v' + utils.version;
utils.majorVersionTag = utils.versionTag.replace(/\..+/, '-latest');
utils.minorVersionTag = utils.versionTag.replace(/(\d+\.\d+).+/, '$1-latest');
utils.name = process.env.npm_package_name;
utils.ownerAndName = 'holidayextras/' + utils.name;
utils.distFolder = process.env.DIST_FOLDER || 'dist';
var repo = ('' + process.env.npm_package_repository_url).split('/');
/* istanbul ignore else */
if (repo.pop() === utils.name + '.git') {
  utils.ownerAndName = repo.pop() + '/' + utils.name;
  console.info('got owner and name', utils.ownerAndName, 'from', process.env.npm_package_repository_url, 'get this from env vars?');
}

utils.getIntegrity = function (file, callback) {
  utils.getSignature(file, function (err, signature) {
    if (err) return callback(err);
    callback(null, 'sha256-' + signature);
  });
};

utils.exec = function (cmd, callback) {
  childProcess.exec(cmd, function (err, stdout, stderr) {
    callback(err, stdout);
  });
};

utils.execAndIgnoreOutput = function (cmd, callback) {
  utils.exec(cmd, function (err) {
    callback(err);
  });
};

utils.createVersionedDistFile = function (file, callback) {
  if (!utils.version) return callback('Version missing - must run this as an npm script');
  var versionedFile = file.replace('.js', '.' + utils.version + '.js');
  var cmd = 'cp ' + file + ' ' + versionedFile;
  utils.exec(cmd, function (err) {
    callback(err, versionedFile);
  });
};

utils.getSignature = function (file, callback) {
  var cmd = 'cat ' + file + ' | openssl dgst -sha256 -binary | openssl enc -base64 -A';
  utils.exec(cmd, callback);
};

utils.checkPrerequisites = function (callback) {
  if (!utils.name) return callback('ERROR: run this as an npm script');
  async.waterfall([utils.getEmail, utils.setEmail, utils.getUser, utils.setUser], callback);
};

utils.getEmail = function (callback) {
  var cmd = 'git config --get user.email';
  utils.exec(cmd, function (ignoredError, email) {
    callback(null, email);
  });
};

utils.setEmail = function (email, callback) {
  if (email) return callback();
  var cmd = 'git config user.email ' + process.env.GITHUB_EMAIL;
  utils.exec(cmd, function () {
    callback();
  });
};

utils.getUser = function (callback) {
  var cmd = 'git config --get user.name';
  utils.exec(cmd, function (ignoredError, name) {
    callback(null, name);
  });
};

utils.setUser = function (name, callback) {
  if (name) return callback();
  var cmd = 'git config user.name ' + process.env.GITHUB_USER;
  utils.exec(cmd, function () {
    callback();
  });
};

utils.getBranch = function (callback) {
  var cmd = 'git rev-parse --abbrev-ref HEAD';
  utils.exec(cmd, function (err, branch) {
    callback(err, process.env.TRAVIS_PULL_REQUEST_BRANCH || process.env.TRAVIS_BRANCH || process.env.CIRCLE_BRANCH || ('' + branch).trim());
  });
};

utils.checkBranch = function (releaseBranch, callback) {
  utils.getBranch(function (unhandledErr, currentBranch) {
    if (releaseBranch !== currentBranch) return callback('Skip this on ' + currentBranch + ' on (' + releaseBranch + ' only)');
    callback();
  });
};

utils.checkAlreadyReleased = function (callback) {
  var cmd = 'git tag --list | grep -E \'^v[0-9]+.[0-9]+.[0-9]+$\' | sort | tail -n 1';
  utils.exec(cmd, function (err, tag) {
    if (err) return callback(err);
    tag = ('' + tag).trim();
    if (tag === utils.versionTag) return callback('already released ' + utils.version + ' - please \u2B06\uFE0F  your version');
    callback();
  });
};

utils.getCommitMessagesSinceLastRelease = function (callback) {
  var cmd = 'git log `git describe --tags --abbrev=0`..HEAD --oneline';
  utils.exec(cmd, function (err, notes) {
    // style it like a markdown list
    notes = '\n' + ('' + notes).trim().replace(/^/mg, '  - ') + '\n';
    callback(err, notes);
  });
};

utils.commit = function (callback) {
  var message = utils.commitMessageWithCIID() + ' [skip ci]';
  utils.exec('git commit -m \'' + message + '\'', function (err) {
    callback(err);
  });
};

utils.push = function (callback) {
  utils.execAndIgnoreOutput('git config --global push.default matching; git push', callback);
};

// relies on something like # changelog being in the CHANGELOG already
utils.updateChangelog = function (notes, callback) {
  fs.readFile('CHANGELOG.md', 'utf-8', function (readErr, contents) {
    if (readErr) return callback(readErr);
    var existingLines = new RegExp('.*' + utils.versionTag + '.*', 'g');
    var newContents = contents.replace(existingLines, '').replace(/\n\s*\n/g, '\n').replace(/# Changelog/gi, '# Changelog \n\n- ' + utils.versionTag + notes);
    fs.writeFile('CHANGELOG.md', newContents, function (writeErr) {
      if (writeErr) return callback(writeErr);
      callback();
    });
  });
};

utils.addFile = function (file, callback) {
  utils.execAndIgnoreOutput('git add ' + file, callback);
};

utils.addDist = utils.addFile.bind(null, 'dist');

utils.addChangelog = utils.addFile.bind(null, 'CHANGELOG.md');

utils.commitMessageWithCIID = function () {
  return ':airplane: Release via CI build ' + (process.env.CIRCLE_BUILD_NUM || process.env.TRAVIS_JOB_ID || '');
};

utils.commitMessageWithCILinks = function () {
  var message = utils.commitMessageWithCIID();
  if (process.env.CIRCLE_BUILD_NUM) {
    return message + ' https://circleci.com/gh/' + utils.ownerAndName + '/' + process.env.CIRCLE_BUILD_NUM;
  }
  if (process.env.TRAVIS_JOB_NUMBER) {
    return message + ' https://travis-ci.com/' + utils.ownerAndName + '/jobs/' + process.env.TRAVIS_JOB_ID;
  }
  return message;
};

utils.tagVersion = function (tag, notes, callback) {
  var message = utils.commitMessageWithCILinks();
  utils.exec('git rev-parse HEAD', function (err, sha) {
    if (err) return callback(err);
    var body = [message, notes].join('\n').replace(/"/g, '');
    var release = {
      tag_name: tag,
      target_commitish: ('' + sha).trim(),
      name: tag,
      body: body,
      draft: false,
      prerelease: false
    };
    var releaseJSON = JSON.stringify(release).replace(/'/g, '');
    var cmd = 'curl ' + credentials + ' --data \'' + releaseJSON + '\' https://api.github.com/repos/' + utils.ownerAndName + '/releases';
    utils.exec(cmd, function (err) {
      if (err) console.warn(err);
      callback();
    });
  });
};

utils.tagAbsoluteVersion = utils.tagVersion.bind(utils, utils.versionTag);
utils.tagMajorVersion = utils.tagVersion.bind(utils, utils.majorVersionTag, '');
utils.tagMinorVersion = utils.tagVersion.bind(utils, utils.minorVersionTag, '');

utils.deleteTag = function (tag, callback) {
  var cmd = 'curl ' + credentials + ' -X DELETE https://api.github.com/repos/' + utils.ownerAndName + '/git/refs/tags/' + tag;
  utils.exec(cmd, function (err) {
    if (err) console.warn(cmd, err);
    // may not exist so just call back
    callback();
  });
};

utils.untagMajorVersion = utils.deleteTag.bind(utils, utils.majorVersionTag);
utils.untagMinorVersion = utils.deleteTag.bind(utils, utils.minorVersionTag);

// is there a better way to check we are no a feature branch?
utils.confirmOnFeatureBranch = function (callback) {
  utils.checkBranch('master', function (err) {
    if (!err) return callback('skipping this on master branch');
    utils.checkBranch('staging', function (err) {
      if (!err) return callback('skipping this on staging branch');
      callback();
    });
  });
};

utils.getSize = function (file, callback) {
  fs.stat(file, function (err, result) {
    if (err || !result) {
      console.warn('could not stat', file, 'did you not `npm run build`?');
      return callback(err);
    }
    callback(null, result.size);
  });
};

utils.reportSize = function (current, previous, callback) {
  var delta = (current - previous) / previous * 100;
  if (delta > 0) {
    console.warn('\u26A0\uFE0F  file size has gone up from ' + previous + ' to ' + current + ' bytes');
    if (delta > 1) console.warn('\uD83D\uDE40  this is more than ' + parseInt(delta, 10) + '% increase!');
  } else if (delta < -1) {
    console.info('🐭  good file size reducing!');
  }
  var prNumber = process.env.TRAVIS_PULL_REQUEST;
  if (process.env.CI_PULL_REQUEST) {
    prNumber = ('' + process.env.CI_PULL_REQUEST).split('/').pop();
  }
  prNumber = parseInt(prNumber, 10);
  /* istanbul ignore next */
  if (prNumber) {
    utils.labelPullRequestWithMetricMovement({
      githubToken: process.env.GITHUB_API_TOKEN,
      ownerAndRepo: utils.ownerAndName,
      prNumber: prNumber,
      metrics: { previous: previous, current: current },
      desirableTrajectory: 'DECREASE',
      minorPercentageThreshold: 1,
      minorValueThreshold: 300,
      majorPercentageThreshold: 3,
      majorValueThreshold: 2000,
      labelModifier: 'page weight'
    }).catch(function (err) {
      console.error('Problem applying page weight label', err);
    });
  }
  callback();
};

utils.build = function (callback) {
  if (!process.env.npm_package_scripts_build) return callback();
  utils.execAndIgnoreOutput('NODE_ENV=production npm run build', callback);
};

utils.getBuiltSizeOfBranch = function (branch, callback) {
  var file = process.env.BUILT_ASSET || utils.distFolder + '/' + utils.name + '.min.js';
  utils.exec('git checkout ' + utils.distFolder + ' 2> /dev/null; git checkout ' + branch + ' && NODE_ENV=production npm run build > /dev/null', function (err) {
    if (err) return callback(err);
    utils.getSize(file, callback);
  });
};

// ⚠️  don't be tempted to put this in postbuild or prebuild...
utils.getBuiltAssetStats = function (callback) {
  utils.getBranch(function (err, branch) {
    if (err) return callback(err);
    utils.getBuiltSizeOfBranch('master', function (err, previousSize) {
      if (err) {
        console.error('We cannot get the size of master; did we do a shallow clone?');
        return callback(err);
      }
      utils.getBuiltSizeOfBranch(branch, function (err, size) {
        if (err) return callback(err);
        utils.reportSize(size, previousSize, callback);
      });
    });
  });
};