#!/usr/bin/env node

const async = require('async')
const fs = require('fs')
const exec = require('child_process').exec
const git = require('simple-git')()
const releaseBranches = process.env.releaseBranches || ['staging', 'master']

let originalFile = process.env.npm_package_name + '.staging.min.js'
let versionedFile = `dist/${process.env.npm_package_name}.staging.min.${process.env.npm_package_version}.js`
if (process.env.NODE_ENV === 'production') {
  originalFile = originalFile.replace('.staging', '')
  versionedFile = versionedFile.replace('.staging', '')
}

const checkPrerequisites = callback => {
  if (!process.env.npm_package_name) return callback('ERROR: run this as an npm script (npm run release)')
  // if (!process.env.GITHUB_USER || !process.env.GITHUB_API_TOKEN) return callback('ERROR: GitHub credentials not set')
  // if (process.env.CIRCLECI && !process.env.GITHUB_EMAIL) return callback('ERROR: GitHub Email required for CircleCI')
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
    const currentBranch = process.env.TRAVIS_BRANCH || ('' + branch).replace(/\n/, '')
    if (!releaseBranches.includes(currentBranch)) return callback(`Only releasing on ${releaseBranches}`)
    callback()
  })
}

const checkAlreadyReleased = callback => {
  if (fs.exists(versionedFile)) {
    return callback('Already exported this ' + versionedFile)
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
  const versionedFile = file.replace('.js', `.${process.env.npm_package_version}.js`)
  const cmd = `cp dist/${file} dist/${versionedFile} && cat dist/${versionedFile} | openssl dgst -sha256 -binary | openssl enc -base64 -A`
  exec(cmd, (err, signature) => {
    callback(err, versionedFile, signature)
  })
}

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

const makeSignedFile = getSignature.bind(null, originalFile)
const addVersionedFile = addFile.bind(null, versionedFile)
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
  makeSignedFile,
  updateChangelog,
  addChangelog,
  addVersionedFile,
  commit,
  push
], (err, result) => {
  if (err) console.warn(err) // don't throw, just let us know
  console.log('done')
})
