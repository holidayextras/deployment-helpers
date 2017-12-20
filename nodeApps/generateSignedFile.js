#!/usr/bin/env node

const async = require('async')
const fs = require('fs')
const path = require('path')
const utils = require('../src/utils')
const exec = require('child_process').exec
const git = require('simple-git')()
const releaseBranch = process.env.RELEASE_BRANCH || 'staging'
const name = process.env.npm_package_name
const version = process.env.npm_package_version
const distPath = path.join(process.cwd(), '/dist/')

const checkAlreadyVersioned = callback => {
  const file = `${distPath}/${name}.min.${version}.js`
  const fullPath = path.resolve(file)
  if (fs.existsSync(fullPath)) {
    return callback(`Already exported ${file}`)
  }
  callback()
}

const build = callback => {
  if (!process.env.npm_package_scripts_build) return callback()
  exec('npm run build', (err, result) => {
    callback(err)
  })
}

const getSignature = (file, callback) => {
  utils.createVersionedDistFile(file, (err, versionedFile) => {
    if (err) return callback(err)
    utils.getIntegrity(versionedFile, (err, signature) => {
      if (err) return callback(err)
      callback(err, versionedFile, signature)
    })
  })
}

const getCommitMessagesSinceLastRelease = (versionedFile, signature, callback) => {
  utils.getCommitMessagesSinceLastRelease((err, notes) => {
    callback(err, notes, versionedFile, signature)
  })
}

const getSignedStagingFile = getSignature.bind(null, `${distPath}/${name}.staging.min.js`)
const getSignedProductionFile = getSignature.bind(null, `${distPath}/${name}.min.js`)

const updateChangelog = (notes, versionedFile, signature, callback) => {
  fs.readFile('CHANGELOG.md', 'utf-8', (readErr, contents) => {
    if (readErr) return callback(readErr)
    const file = ('' + versionedFile).replace(distPath, '')
    const existingLines = new RegExp(`.*${file}.*`, 'g')
    const newContents = contents
      .replace(existingLines, '')
      .replace(/\n\s*\n/g, '\n')
      .replace('# Changelog', `# Changelog \n\n- ${file} - signature: ${signature}${notes}`)
    fs.writeFile('CHANGELOG.md', newContents, function (writeErr) {
      if (writeErr) return callback(writeErr)
      callback()
    })
  })
}

const addFile = (file, callback) => {
  git.add(file, (err, result) => {
    callback(err)
  })
}

const addStagingFile = addFile.bind(null, `${distPath}/${name}.staging.min.${version}.js`)
const addProductionFile = addFile.bind(null, `${distPath}/${name}.min.${version}.js`)
const addChangelog = addFile.bind(null, 'CHANGELOG.md')

const commit = callback => {
  let message = ':airplane: Release via CI build '
  if (process.env.CIRCLE_BUILD_NUM) {
    message = message + `[${process.env.CIRCLE_BUILD_NUM}](https://circleci.com/gh/${process.env.npm_package_name}/${process.env.CIRCLE_BUILD_NUM})`
  } else if (process.env.TRAVIS_JOB_NUMBER) {
    message = message + `[${process.env.TRAVIS_JOB_ID}](https://travis-ci.com/${process.env.npm_package_name}/jobs/${process.env.TRAVIS_JOB_ID})`
  }
  message = message + '\n\n[skip ci]'
  git.commit(message, (err, result) => {
    callback(err)
  })
}

const remote = process.env.npm_package_repository_url.replace('git+https://github.com/', 'git@github.com:')

const push = callback => {
  git.push(remote, (err, result) => {
    callback(err)
  })
}

async.waterfall([
  utils.checkPrerequisites,
  utils.checkBranch.bind(utils, releaseBranch),
  checkAlreadyVersioned,
  build,
  getSignedStagingFile,
  getCommitMessagesSinceLastRelease,
  updateChangelog,
  getSignedProductionFile,
  updateChangelog.bind(null, ''),
  addChangelog,
  addStagingFile,
  addProductionFile,
  commit,
  push
], (err, result) => {
  if (err) console.warn(err) // don't throw, just let us know
  console.log('done')
})
