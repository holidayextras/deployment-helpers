#!/usr/bin/env node

const async = require('async')
const fs = require('fs')
const path = require('path')
const utils = require('../src/utils')
const exec = require('child_process').exec
const git = require('simple-git')()
const releaseBranch = process.env.releaseBranch || 'staging'
const name = process.env.npm_package_name
const version = process.env.npm_package_version
console.log('process.cwd() is', process.cwd())
const distPath = process.cwd()

const checkPrerequisites = callback => {
  if (!process.env.npm_package_name) return callback('ERROR: run this as an npm script (npm run release)')
  callback()
}

const getEmail = callback => {
  git.raw(['config', '--get', 'user.email'], callback)
}

const setEmail = (email, callback) => {
  if (!email) git.addConfig('user.email', process.env.GITHUB_EMAIL)
  callback()
}

const getUser = callback => {
  git.raw(['config', '--get', 'user.name'], callback)
}

const setUser = (name, callback) => {
  if (!name) git.addConfig('user.name', process.env.GITHUB_EMAIL)
  callback()
}

const checkBranch = callback => {
  git.revparse(['--abbrev-ref', 'HEAD'], (err, branch) => {
    if (err) return callback(err)
    const currentBranch = process.env.TRAVIS_BRANCH || process.env.CIRCLE_BRANCH || ('' + branch).replace(/\n/, '')
    if (releaseBranch !== currentBranch) return callback(`Only releasing on ${releaseBranch}`)
    callback()
  })
}

const checkAlreadyReleased = callback => {
  const fullPath = path.resolve(`${distPath}/${name}.min.${version}.js`)
  if (fs.existsSync(fullPath)) {
    return callback(`Already exported ${distPath}${name}.min.${version}.js`)
  }
  callback()
}

const build = callback => {
  if (!process.env.npm_package_scripts_build) return callback()
  console.log('building...')
  exec('npm run build', (err, result) => {
    console.log('build got', err, result)
    callback(err)
  })
}

const getSignature = (file, callback) => {
  utils.createVersionedDistFile(file, (err, versionedFile) => {
    console.log('createVersionedDistFile got', err, versionedFile)
    if (err) return callback(err)
    utils.getIntegrity(versionedFile, (err, signature) => {
      console.log('getIntegrity got', err, signature)
      if (err) return callback(err)
      callback(err, versionedFile, signature)
    })
  })
}

const getSignedStagingFile = getSignature.bind(null, `${distPath}/${name}.staging.min.js`)
const getSignedProductionFile = getSignature.bind(null, `${distPath}/${name}.min.js`)

const updateChangelog = (versionedFile, signature, callback) => {
  fs.readFile('CHANGELOG.md', 'utf-8', (readErr, contents) => {
    if (readErr) return callback(readErr)
    const existingLines = new RegExp(`.*${versionedFile}.*`, 'g')
    const newContents = contents
      .replace(existingLines, '')
      .replace(/\n\s*\n/g, '\n')
      .replace('# Changelog', `# Changelog \n\n- ${versionedFile} - signature: ${signature}`)
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
  let message = ':airplane: Release via CI build -ci'
  if (process.env.CIRCLE_BUILD_NUM) {
    message = message + ` [${process.env.CIRCLE_BUILD_NUM}](https://circleci.com/gh/${process.env.npm_package_name}/${process.env.CIRCLE_BUILD_NUM})`
  } else if (process.env.TRAVIS_JOB_NUMBER) {
    message = message + ` [${process.env.TRAVIS_JOB_ID}](https://travis-ci.com/${process.env.npm_package_name}/jobs/${process.env.TRAVIS_JOB_ID})`
  }
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
  checkPrerequisites,
  getEmail,
  setEmail,
  getUser,
  setUser,
  checkBranch,
  checkAlreadyReleased,
  build,
  getSignedStagingFile,
  updateChangelog,
  getSignedProductionFile,
  updateChangelog,
  addChangelog,
  addStagingFile,
  addProductionFile,
  commit,
  push
], (err, result) => {
  if (err) console.warn(err) // don't throw, just let us know
  console.log('done')
})
