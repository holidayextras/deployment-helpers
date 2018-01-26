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
}

utils.getIntegrity = (file, callback) => {
  utils.getSignature(file, (err, signature) => {
    if (err) return callback(err)
    callback(null, 'sha256-' + signature)
  })
}

utils.exec = (cmd, callback) => {
  childProcess.exec(cmd, (err, stdout, stderr) => {
    // console.info(cmd, 'got', err, stdout, stderr)
    callback(err, stdout)
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
    if (releaseBranch !== currentBranch) return callback(`Skip this on ${currentBranch} on (${releaseBranch} only)`)
    callback()
  })
}

utils.checkAlreadyReleased = callback => {
  const cmd = `git tag --list | grep -E '^v[0-9]+.[0-9]+.[0-9]+$' | sort | tail -n 1`
  utils.exec(cmd, (err, tag) => {
    if (err) return callback(err)
    tag = ('' + tag).trim()
    if (tag === utils.versionTag) return callback(`already released ${utils.version} - please ⬆️  your version`)
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

utils.tagVersion = (tag, notes, callback) => {
  let message = ':airplane: Release via CI build '
  if (process.env.CIRCLE_BUILD_NUM) {
    message = message + `[${process.env.CIRCLE_BUILD_NUM}](https://circleci.com/gh/${utils.ownerAndName}/${process.env.CIRCLE_BUILD_NUM})`
  } else if (process.env.TRAVIS_JOB_NUMBER) {
    message = message + `[${process.env.TRAVIS_JOB_ID}](https://travis-ci.com/${utils.ownerAndName}/jobs/${process.env.TRAVIS_JOB_ID})`
  }
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
      if (err) console.warn(err)
      callback()
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
