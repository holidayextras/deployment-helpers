const async = require('async')
const childProcess = require('child_process')
const fs = require('fs')

const utils = module.exports = {}

utils.labelPullRequestWithMetricMovement = require('./labelPullRequestWithMetricMovement')

const credentials = `-u "${process.env.GITHUB_USER}:${process.env.GITHUB_API_TOKEN}"`

utils.version = process.env.npm_package_version
utils.versionTag = 'v' + utils.version
utils.majorVersionTag = utils.versionTag.replace(/\..+/, '-latest')
utils.minorVersionTag = utils.versionTag.replace(/(\d+\.\d+).+/, '$1-latest')
utils.name = process.env.npm_package_name
utils.ownerAndName = `holidayextras/${utils.name}`
utils.distFolder = process.env.DIST_FOLDER || 'dist'
const repo = ('' + process.env.npm_package_repository_url).split('/')
/* istanbul ignore else */
if (repo.pop() === `${utils.name}.git`) {
  utils.ownerAndName = `${repo.pop()}/${utils.name}`
  console.info('got owner and name', utils.ownerAndName, 'from', process.env.npm_package_repository_url, 'get this from env vars?')
}

utils.getIntegrity = (file, callback) => {
  utils.getSignature(file, (err, signature) => {
    if (err) return callback(err)
    callback(null, 'sha256-' + signature)
  })
}

utils.exec = (cmd, callback) => {
  childProcess.exec(cmd, (err, stdout, stderr) => {
    callback(err, stdout)
  })
}

utils.execAndIgnoreOutput = (cmd, callback) => {
  utils.exec(cmd, err => {
    callback(err)
  })
}

utils.createVersionedDistFile = (file, callback) => {
  if (!utils.version) return callback('Version missing - must run this as an npm script')
  const versionedFile = file.replace('.js', `.${utils.version}.js`)
  const cmd = `cp ${file} ${versionedFile}`
  utils.exec(cmd, err => {
    callback(err, versionedFile)
  })
}

utils.getSignature = (file, callback) => {
  const cmd = `cat ${file} | openssl dgst -sha256 -binary | openssl enc -base64 -A`
  utils.exec(cmd, callback)
}

utils.checkPrerequisites = callback => {
  if (!utils.name) return callback('ERROR: run this as an npm script')
  async.waterfall([
    utils.getEmail,
    utils.setEmail,
    utils.getUser,
    utils.setUser
  ], callback)
}

utils.getEmail = callback => {
  const cmd = 'git config --get user.email'
  utils.exec(cmd, (ignoredError, email) => {
    callback(null, email)
  })
}

utils.setEmail = (email, callback) => {
  if (email) return callback()
  const cmd = `git config user.email ${process.env.GITHUB_EMAIL}`
  utils.exec(cmd, () => {
    callback()
  })
}

utils.getUser = callback => {
  const cmd = 'git config --get user.name'
  utils.exec(cmd, (ignoredError, name) => {
    callback(null, name)
  })
}

utils.setUser = (name, callback) => {
  if (name) return callback()
  const cmd = `git config user.name ${process.env.GITHUB_USER}`
  utils.exec(cmd, () => {
    callback()
  })
}

utils.getBranch = callback => {
  const cmd = 'git rev-parse --abbrev-ref HEAD'
  utils.exec(cmd, (err, branch) => {
    callback(err, process.env.TRAVIS_PULL_REQUEST_BRANCH || process.env.TRAVIS_BRANCH || process.env.CIRCLE_BRANCH || ('' + branch).trim())
  })
}

utils.checkBranch = (releaseBranch, callback) => {
  utils.getBranch((unhandledErr, currentBranch) => {
    if (releaseBranch !== currentBranch) return callback(`skip this on ${currentBranch} (on ${releaseBranch} only)`)
    callback()
  })
}

utils.checkAlreadyReleased = callback => {
  const cmd = `git tag --list | grep -E '^${utils.versionTag}$'`
  console.log('checkAlreadyReleased', cmd, 'looking for', utils.versionTag)
  utils.exec(cmd, (err, tag) => {
    console.log('got', err, tag)
    if (err) return callback(err)
    if (tag) return callback(`already released ${utils.version} - please ⬆️  your version`)
    callback()
  })
}

utils.getCommitMessagesSinceLastRelease = callback => {
  const cmd = 'git log `git describe --tags --abbrev=0`..HEAD --oneline'
  utils.exec(cmd, (err, notes) => {
    // style it like a markdown list
    notes = '\n' + ('' + notes).trim().replace(/^/mg, '  - ') + '\n'
    callback(err, notes)
  })
}

utils.commit = callback => {
  const message = utils.commitMessageWithCIID() + ' [skip ci]'
  utils.exec(`git commit -m '${message}'`, (err, stdout, stderr) => {
    console.log('committed, got', err, stdout, stderr) // debug while this is silently failing
    callback(err)
  })
}

utils.push = callback => {
  utils.exec(`git config --global push.default matching; git push`, (err, stdout, stderr) => {
    console.log('pushed, got', err, stdout, stderr) // debug while this is silently failing
    callback(err)
  })
}

// relies on something like # changelog being in the CHANGELOG already
utils.updateChangelog = (notes, callback) => {
  fs.readFile('CHANGELOG.md', 'utf-8', (readErr, contents) => {
    if (readErr) return callback(readErr)
    const existingLines = new RegExp(`.*${utils.versionTag}.*`, 'g')
    const newContents = contents
      .replace(existingLines, '')
      .replace(/\n\s*\n/g, '\n')
      .replace(/# Changelog/gi, `# Changelog \n\n- ${utils.versionTag}${notes}`)
    fs.writeFile('CHANGELOG.md', newContents, function (writeErr) {
      if (writeErr) return callback(writeErr)
      callback()
    })
  })
}

utils.addFile = (file, callback) => {
  utils.exec(`git add ${file}`, (err, stdout, stderr) => {
    console.log('added', file, 'got', err, stdout, stderr) // debug while this is silently failing
    callback(err)
  })
}

utils.addDist = utils.addFile.bind(null, 'dist')

utils.addChangelog = utils.addFile.bind(null, 'CHANGELOG.md')

utils.commitMessageWithCIID = () => {
  return `:airplane: Release via CI build ${process.env.CIRCLE_BUILD_NUM || process.env.TRAVIS_JOB_ID || ''}`
}

utils.commitMessageWithCILinks = () => {
  let message = utils.commitMessageWithCIID()
  if (process.env.CIRCLE_BUILD_NUM) {
    return `${message} https://circleci.com/gh/${utils.ownerAndName}/${process.env.CIRCLE_BUILD_NUM}`
  }
  if (process.env.TRAVIS_JOB_NUMBER) {
    return `${message} https://travis-ci.com/${utils.ownerAndName}/jobs/${process.env.TRAVIS_JOB_ID}`
  }
  return message
}

utils.tagVersion = (tag, notes, callback) => {
  const message = utils.commitMessageWithCILinks()
  utils.exec(`git rev-parse HEAD`, (err, sha) => {
    if (err) return callback(err)
    const body = [message, notes].join('\n').replace(/"/g, '')
    const release = {
      tag_name: tag,
      target_commitish: ('' + sha).trim(),
      name: tag,
      body,
      draft: false,
      prerelease: false
    }
    const releaseJSON = JSON.stringify(release).replace(/'/g, '')
    const cmd = `curl ${credentials} --data '${releaseJSON}' https://api.github.com/repos/${utils.ownerAndName}/releases`
    utils.exec(cmd, err => {
      if (err) console.warn('error', err, 'with tagging', cmd)
      callback(err)
    })
  })
}

utils.tagAbsoluteVersion = utils.tagVersion.bind(utils, utils.versionTag)
utils.tagMajorVersion = utils.tagVersion.bind(utils, utils.majorVersionTag, '')
utils.tagMinorVersion = utils.tagVersion.bind(utils, utils.minorVersionTag, '')

utils.deleteTag = (tag, callback) => {
  const cmd = `curl ${credentials} -X DELETE https://api.github.com/repos/${utils.ownerAndName}/git/refs/tags/${tag}`
  utils.exec(cmd, err => {
    if (err) console.warn(cmd, err)
    // may not exist so just call back
    callback()
  })
}

utils.untagMajorVersion = utils.deleteTag.bind(utils, utils.majorVersionTag)
utils.untagMinorVersion = utils.deleteTag.bind(utils, utils.minorVersionTag)

// is there a better way to check we are no a feature branch?
utils.confirmOnFeatureBranch = callback => {
  utils.checkBranch('master', err => {
    if (!err) return callback('skipping this on master branch')
    utils.checkBranch('staging', err => {
      if (!err) return callback('skipping this on staging branch')
      callback()
    })
  })
}

utils.getSize = (file, callback) => {
  fs.stat(file, (err, result) => {
    if (err || !result) {
      console.warn('could not stat', file, 'did you not `npm run build`?')
      return callback(err)
    }
    callback(null, result.size)
  })
}

utils.reportSize = (current, previous, callback) => {
  const delta = ((current - previous) / previous) * 100
  if (delta > 0) {
    console.warn(`⚠️  file size has gone up from ${previous} to ${current} bytes`)
    if (delta > 1) console.warn(`🙀  this is more than ${parseInt(delta, 10)}% increase!`)
  } else if (delta < -1) {
    console.info('🐭  good file size reducing!')
  }
  let prNumber = process.env.TRAVIS_PULL_REQUEST
  if (process.env.CI_PULL_REQUEST) {
    prNumber = ('' + process.env.CI_PULL_REQUEST).split('/').pop()
  }
  prNumber = parseInt(prNumber, 10)
  /* istanbul ignore next */
  if (prNumber) {
    utils.labelPullRequestWithMetricMovement({
      githubToken: process.env.GITHUB_API_TOKEN,
      ownerAndRepo: utils.ownerAndName,
      prNumber,
      metrics: { previous, current },
      desirableTrajectory: 'DECREASE',
      minorPercentageThreshold: 1,
      minorValueThreshold: 300,
      majorPercentageThreshold: 3,
      majorValueThreshold: 2000,
      labelModifier: 'page weight'
    }).catch(err => {
      console.error('Problem applying page weight label', err)
    })
  }
  callback()
}

utils.build = callback => {
  if (!process.env.npm_package_scripts_build) return callback()
  utils.execAndIgnoreOutput('NODE_ENV=production npm run build', callback)
}

utils.getBuiltSizeOfBranch = (branch, callback) => {
  const file = process.env.BUILT_ASSET || `${utils.distFolder}/${utils.name}.min.js`
  utils.exec(`git checkout ${utils.distFolder} 2> /dev/null; git checkout ${branch} && NODE_ENV=production npm run build > /dev/null`, err => {
    if (err) return callback(err)
    utils.getSize(file, callback)
  })
}

// ⚠️  don't be tempted to put this in postbuild or prebuild...
utils.getBuiltAssetStats = callback => {
  utils.getBranch((err, branch) => {
    if (err) return callback(err)
    utils.getBuiltSizeOfBranch('master', (err, previousSize) => {
      if (err) {
        console.error('We cannot get the size of master; did we do a shallow clone?')
        return callback(err)
      }
      utils.getBuiltSizeOfBranch(branch, (err, size) => {
        if (err) return callback(err)
        utils.reportSize(size, previousSize, callback)
      })
    })
  })
}
