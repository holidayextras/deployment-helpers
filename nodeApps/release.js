#!/usr/bin/env node

const async = require('async')
const utils = require('../src/utils')
const releaseBranch = process.env.RELEASE_BRANCH || 'master'

async.waterfall([
  utils.checkPrerequisites,
  utils.checkBranch.bind(utils, releaseBranch),
  utils.checkAlreadyReleased,
  utils.untagMajorVersion,
  utils.tagMajorVersion,
  utils.untagMinorVersion,
  utils.tagMinorVersion,
  utils.getCommitMessagesSinceLastRelease,
  utils.tagAbsoluteVersion
], (err, result) => {
  if (err) console.warn(err) // don't throw, just let us know
  console.log('done')
})
