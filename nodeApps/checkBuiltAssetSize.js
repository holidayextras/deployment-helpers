#!/usr/bin/env node

const async = require('async')
const utils = require('../src/utils')

async.waterfall([
  utils.checkPrerequisites,
  utils.confirmOnFeatureBranch,
  utils.getBuiltAssetStats
], err => {
  if (err) console.warn(err) // don't throw, just let us know
})
