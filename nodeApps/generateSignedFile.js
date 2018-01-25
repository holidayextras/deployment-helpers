#!/usr/bin/env node

const async = require('async')
const fs = require('fs')
const path = require('path')
const utils = require('../src/utils')
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

// specific to a repo with a signed file, different to the version in utils
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

const addStagingFile = utils.addFile.bind(null, `${distPath}/${name}.staging.min.${version}.js`)
const addProductionFile = utils.addFile.bind(null, `${distPath}/${name}.min.${version}.js`)

async.waterfall([
  utils.checkPrerequisites,
  utils.checkBranch.bind(utils, releaseBranch),
  checkAlreadyVersioned,
  utils.build,
  getSignedStagingFile,
  getCommitMessagesSinceLastRelease,
  updateChangelog,
  getSignedProductionFile,
  updateChangelog.bind(null, ''),
  utils.addChangelog,
  addStagingFile,
  addProductionFile,
  utils.commit,
  utils.push
], (err, result) => {
  if (err) console.warn(err) // don't throw, just let us know
  console.log('done')
})
