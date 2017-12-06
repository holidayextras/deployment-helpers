#!/usr/bin/env node

const async = require('async')
const utils = require('../src/utils')

async.waterfall([
  utils.checkPrerequisites,
  utils.checkAlreadyReleased
], err => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
})
