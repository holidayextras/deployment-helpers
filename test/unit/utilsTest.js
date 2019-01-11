const utils = require('../../src/utils')
const fs = require('fs')
const childProcess = require('child_process')

describe('utils', function () {
  let callback = null
  let env = null

  beforeEach(function () {
    sandbox.stub(childProcess, 'exec').yields()
    sandbox.stub(utils, 'labelPullRequestWithMetricMovement').resolves()
    env = JSON.parse(JSON.stringify(process.env))
    callback = sandbox.stub()
  })

  afterEach(function () {
    process.env = JSON.parse(JSON.stringify(env))
    sandbox.restore()
  })

  describe('exec', function () {
    beforeEach(function () {
      childProcess.exec.yields(null, 'foo', 'bar')
      utils.exec('CMD', callback)
    })

    it('proxies childProcess.exec', function () {
      expect(childProcess.exec).to.have.been.calledOnce()
        .and.calledWith('CMD')
    })

    it('yields, throwing away stderr', function () {
      expect(callback).to.have.been.calledOnce()
        .and.calledWith(null, 'foo')
    })
  })

  describe('execAndIgnoreOutput', function () {
    beforeEach(function () {
      childProcess.exec.yields('foo', 'bar', 'etc')
      utils.execAndIgnoreOutput('CMD', callback)
    })

    it('proxies childProcess.exec', function () {
      expect(childProcess.exec).to.have.been.calledOnce()
        .and.calledWith('CMD')
    })

    it('yields, throwing away stdout and stderr', function () {
      expect(callback).to.have.been.calledOnce()
        .and.calledWithExactly('foo')
    })
  })

  describe('createVersionedFile', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
    })

    describe('when we have version', function () {
      beforeEach(function () {
        utils.exec.yields(null)
        utils.version = 'VERSION'
        utils.createVersionedDistFile('foo.js', callback)
      })

      it('copies the file', function () {
        expect(utils.exec).to.have.been.calledOnce()
          .and.calledWith('cp foo.js foo.VERSION.js')
      })

      it('yields versioned file name', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(null, 'foo.VERSION.js')
      })
    })

    describe('when we do not have version', function () {
      beforeEach(function () {
        utils.version = null
        utils.createVersionedDistFile('foo.js', callback)
      })

      it('does not copy the file', function () {
        expect(utils.exec).not.to.have.been.called()
      })

      it('yields an error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(sandbox.match.string)
      })
    })
  })

  describe('getIntegrity', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
      sandbox.stub(utils, 'getSignature')
    })

    describe('when signature is ok', function () {
      beforeEach(function () {
        utils.getSignature.yields(null, 'SIGNATURE')
        utils.getIntegrity('foo', callback)
      })

      it('yields integrity value', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(null, 'sha256-SIGNATURE')
      })
    })

    describe('when signature errors', function () {
      beforeEach(function () {
        utils.getSignature.yields('OOPS')
        utils.getIntegrity('foo', callback)
      })

      it('yields error only', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('OOPS')
      })
    })
  })

  describe('getSignature', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
    })

    describe('when signature is ok', function () {
      beforeEach(function () {
        utils.exec.yields(null, 'SIGNATURE')
        utils.getSignature('foo', callback)
      })

      it('yields integrity value', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(null, 'SIGNATURE')
      })
    })

    describe('when signature errors', function () {
      beforeEach(function () {
        utils.exec.yields('OOPS')
        utils.getSignature('foo', callback)
      })

      it('yields error only', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('OOPS')
      })
    })
  })

  describe('getEmail', function () {
    it('does not throw', function () {
      expect(function () {
        utils.getEmail(callback)
      }).not.to.throw()
    })
  })

  describe('setEmail', function () {
    describe('with email', function () {
      it('does not throw', function () {
        expect(function () {
          utils.setEmail('EMAIL', callback)
        }).not.to.throw()
      })
    })

    describe('without email', function () {
      it('does not throw', function () {
        expect(function () {
          utils.setEmail(null, callback)
        }).not.to.throw()
      })
    })
  })

  describe('getUser', function () {
    it('does not throw', function () {
      expect(function () {
        utils.getUser(callback)
      }).not.to.throw()
    })
  })

  describe('setUser', function () {
    describe('with user', function () {
      it('does not throw', function () {
        expect(function () {
          utils.setUser('USER', callback)
        }).not.to.throw()
      })
    })

    describe('without user', function () {
      it('does not throw', function () {
        expect(function () {
          utils.setUser(null, callback)
        }).not.to.throw()
      })
    })
  })

  describe('commitMessageWithCIID', function () {
    beforeEach(function () {
      delete process.env.CIRCLE_BUILD_NUM
      delete process.env.TRAVIS_JOB_ID
    })

    describe('on circleci', function () {
      beforeEach(function () {
        process.env.CIRCLE_BUILD_NUM = 'CIRCLE'
      })

      it('returns a string', function () {
        expect(utils.commitMessageWithCIID()).to.match(/^:\w+: Release via CI build CIRCLE/)
      })
    })

    describe('on travis', function () {
      beforeEach(function () {
        process.env.TRAVIS_JOB_ID = 'TRAVIS'
      })

      it('returns a string', function () {
        expect(utils.commitMessageWithCIID()).to.match(/^:\w+: Release via CI build TRAVIS/)
      })
    })

    describe('on neither', function () {
      it('returns a string', function () {
        expect(utils.commitMessageWithCIID()).to.match(/^:\w+: Release via CI build/)
      })
    })
  })

  describe('getBranch', function () {
    beforeEach(function () {
      delete process.env.CIRCLE_BRANCH
      delete process.env.TRAVIS_BRANCH
      delete process.env.TRAVIS_PULL_REQUEST_BRANCH
    })

    describe('with travis pr', function () {
      beforeEach(function () {
        process.env.TRAVIS_PULL_REQUEST_BRANCH = 'foo'
      })

      it('does not throw', function () {
        expect(function () {
          utils.getBranch(callback)
        }).not.to.throw()
      })
    })

    describe('with travis', function () {
      beforeEach(function () {
        process.env.TRAVIS_BRANCH = 'foo'
      })

      it('does not throw', function () {
        expect(function () {
          utils.getBranch(callback)
        }).not.to.throw()
      })
    })

    describe('with circle', function () {
      beforeEach(function () {
        process.env.CIRCLE_BRANCH = 'foo'
      })

      it('does not throw', function () {
        expect(function () {
          utils.getBranch(callback)
        }).not.to.throw()
      })
    })

    describe('with neither', function () {
      it('does not throw', function () {
        expect(function () {
          utils.getBranch(callback)
        }).not.to.throw()
      })
    })
  })

  describe('checkBranch', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'getBranch').yields(null, 'foo')
    })

    describe('when branch matches', function () {
      beforeEach(function () {
        utils.checkBranch('foo', callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })

    describe('when branch does not match', function () {
      beforeEach(function () {
        utils.checkBranch('bar', callback)
      })

      it('yields an error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(sandbox.match.string)
      })
    })
  })

  describe('checkAlreadyReleased', function () {
    let version = null

    beforeEach(function () {
      version = utils.versionTag
      utils.versionTag = 'VERSION'
      sandbox.stub(utils, 'exec').yields()
    })

    afterEach(function () {
      utils.versionTag = version
    })

    describe('when an error', function () {
      beforeEach(function () {
        utils.exec.yields('oops')
        utils.checkAlreadyReleased(callback)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when already released', function () {
      beforeEach(function () {
        utils.exec.yields(null, 'VERSION\n')
        utils.checkAlreadyReleased(callback)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(sandbox.match.string)
      })
    })

    describe('when not already released', function () {
      beforeEach(function () {
        utils.exec.yields()
        utils.checkAlreadyReleased(callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })
  })

  describe('getCommitMessagesSinceLastRelease', function () {
    let version = null

    beforeEach(function () {
      version = utils.versionTag
      utils.versionTag = 'VERSION'
      sandbox.stub(utils, 'exec').yields()
      utils.getCommitMessagesSinceLastRelease(callback)
    })

    afterEach(function () {
      utils.versionTag = version
    })

    it('calls exec', function () {
      expect(utils.exec).to.have.been.calledOnce()
    })

    it('yields', function () {
      expect(callback).to.have.been.calledOnce()
    })
  })

  describe('tagVersion', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
      sandbox.stub(console, 'warn')
    })

    describe('when first call errors', function () {
      beforeEach(function () {
        utils.exec.onFirstCall().yields('oops')
        utils.tagVersion('TAG', 'NOTES', callback)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when second call errors', function () {
      beforeEach(function () {
        utils.exec.onSecondCall().yields('oops')
        utils.tagVersion('TAG', 'NOTES', callback)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when we have circle env vars', function () {
      beforeEach(function () {
        delete process.env.TRAVIS_JOB_NUMBER
        process.env.CIRCLE_BUILD_NUM = true
        utils.tagVersion('TAG', 'NOTES', callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(undefined)
      })
    })

    describe('when we have travis env vars', function () {
      beforeEach(function () {
        delete process.env.CIRCLE_BUILD_NUM
        process.env.TRAVIS_JOB_NUMBER = true
        utils.tagVersion('TAG', 'NOTES', callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(undefined)
      })
    })

    describe('when we have neither ci env vars', function () {
      beforeEach(function () {
        delete process.env.CIRCLE_BUILD_NUM
        delete process.env.TRAVIS_JOB_NUMBER
        utils.tagVersion('TAG', 'NOTES', callback)
      })

      it('still yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(undefined)
      })
    })
  })

  describe('deleteTag', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
      sandbox.stub(console, 'warn')
    })

    describe('when it errors', function () {
      beforeEach(function () {
        utils.exec.yields('oops')
        utils.deleteTag('foo', callback)
      })

      it('just yields as we handle the warning elsewhere', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })

    describe('when all is ok', function () {
      beforeEach(function () {
        utils.deleteTag('foo', callback)
      })

      it('does not warn us', function () {
        expect(console.warn).not.to.have.been.called()
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })
  })

  describe('confirmOnFeatureBranch', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'checkBranch').yields('oops')
    })

    describe('when we are on master branch', function () {
      beforeEach(function () {
        utils.checkBranch.withArgs('master').yields()
        utils.confirmOnFeatureBranch(callback)
      })

      it('yields an error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(sandbox.match.string)
      })
    })

    describe('when we are on staging branch', function () {
      beforeEach(function () {
        utils.checkBranch.withArgs('staging').yields()
        utils.confirmOnFeatureBranch(callback)
      })

      it('yields an error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(sandbox.match.string)
      })
    })

    describe('when we are on neither', function () {
      beforeEach(function () {
        utils.confirmOnFeatureBranch(callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })
  })

  describe('getSize', function () {
    beforeEach(function () {
      sandbox.stub(fs, 'stat').yields()
      sandbox.stub(console, 'warn')
    })

    describe('when it errors', function () {
      beforeEach(function () {
        fs.stat.yields('oops')
        utils.getSize('FILE', callback)
      })

      it('warns us', function () {
        expect(console.warn).to.have.been.calledOnce()
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when we have no file stats', function () {
      beforeEach(function () {
        fs.stat.yields(null)
        utils.getSize('FILE', callback)
      })

      it('warns us', function () {
        expect(console.warn).to.have.been.calledOnce()
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(null)
      })
    })

    describe('when we have file stats', function () {
      beforeEach(function () {
        fs.stat.yields(null, { size: 666 })
        utils.getSize('FILE', callback)
      })

      it('yields the file size', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(null, 666)
      })
    })
  })

  describe('reportSize', function () {
    beforeEach(function () {
      sandbox.stub(console, 'info')
      sandbox.stub(console, 'warn')
    })

    describe('when size is sligthly smaller', function () {
      beforeEach(function () {
        utils.reportSize(666, 667, callback)
      })

      it('does not log it', function () {
        expect(console.info).not.to.have.been.called()
      })

      it('does not warn us', function () {
        expect(console.warn).not.to.have.been.called()
      })
    })

    describe('when size is significantly smaller', function () {
      beforeEach(function () {
        utils.reportSize(666, 777, callback)
      })

      it('logs it in a friendly way', function () {
        expect(console.info).to.have.been.called()
      })

      it('does not warn us', function () {
        expect(console.warn).not.to.have.been.called()
      })
    })

    describe('when size is slightly bigger', function () {
      beforeEach(function () {
        utils.reportSize(667, 666, callback)
      })

      it('has no friendly message', function () {
        expect(console.info).not.to.have.been.called()
      })

      it('warns us', function () {
        expect(console.warn).to.have.been.calledOnce()
      })
    })

    describe('when size is significantly bigger', function () {
      beforeEach(function () {
        utils.reportSize(777, 666, callback)
      })

      it('warns us twice', function () {
        expect(console.warn).to.have.been.calledTwice()
      })
    })

    describe('when we have pr env var from circle', function () {
      beforeEach(function () {
        process.env.CI_PULL_REQUEST = 'foo/667'
        utils.reportSize(777, 666, callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
      })
    })

    describe('when we do not have env var from circle', function () {
      beforeEach(function () {
        delete process.env.CI_PULL_REQUEST
        utils.reportSize(777, 666, callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
      })
    })
  })

  describe('commit', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'commitMessageWithCIID').returns('MESSAGE')
      sandbox.stub(utils, 'exec').yields()
      utils.commit(callback)
    })

    it('commits', function () {
      expect(utils.exec).to.have.been.calledOnce()
        .and.calledWith(`git commit -m 'MESSAGE [skip ci]'`)
    })
  })

  describe('build', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'execAndIgnoreOutput').yields()
      sandbox.stub(utils, 'getSize').yields()
      sandbox.stub(fs, 'writeFile').yields()
      sandbox.stub(utils, 'addFile').yields()
      process.env.npm_package_scripts_build = 'BUILD'
    })

    describe('when there is no build script', function () {
      beforeEach(function () {
        delete process.env.npm_package_scripts_build
        utils.build(callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })

    describe('when build fails', function () {
      beforeEach(function () {
        utils.execAndIgnoreOutput.yields('oops')
        utils.build(callback)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when get size fails', function () {
      beforeEach(function () {
        utils.getSize.yields('oops')
        utils.build(callback)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when write file fails', function () {
      beforeEach(function () {
        fs.writeFile.yields('oops')
        utils.build(callback)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when add file fails', function () {
      beforeEach(function () {
        utils.addFile.yields('oops')
        utils.build(callback)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when all is ok', function () {
      beforeEach(function () {
        utils.build(callback)
      })

      it('builds', function () {
        expect(utils.execAndIgnoreOutput).to.have.been.calledOnce()
          .and.calledWith('NODE_ENV=production npm run build')
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })
  })

  describe('getBuiltSizeOfBranch', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
      sandbox.stub(utils, 'getSize').yields()
    })

    describe('when build errors', function () {
      beforeEach(function () {
        utils.exec.yields('oops')
        utils.getBuiltSizeOfBranch('BRANCH', callback)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when it builds successfully', function () {
      beforeEach(function () {
        utils.exec.yields()
        utils.getBuiltSizeOfBranch('BRANCH', callback)
      })

      it('gets the size', function () {
        expect(utils.getSize).to.have.been.calledOnce()
          .and.calledWithExactly(sandbox.match.string, callback)
      })
    })
  })

  describe('getBuiltAssetStats', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'getBranch').yields(null, 'foo')
      sandbox.stub(utils, 'getBuiltSizeOfBranch').yields()
      sandbox.stub(utils, 'reportSize').yields()
      sandbox.stub(utils, 'getPreviousSize').yields(null, 777)
    })

    describe('when on the wrong branch', function () {
      beforeEach(function () {
        utils.getBranch.yields('oops')
        utils.getBuiltAssetStats(callback)
      })

      it('does not get sizes', function () {
        expect(utils.getBuiltSizeOfBranch).not.to.have.been.called()
      })

      it('does not report size', function () {
        expect(utils.reportSize).not.to.have.been.called()
      })

      it('yields an error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when getting size of master branch errors', function () {
      beforeEach(function () {
        utils.getPreviousSize.yields('oops')
        utils.getBuiltAssetStats(callback)
      })

      it('does not get size of other branch', function () {
        expect(utils.getBuiltSizeOfBranch).not.to.have.been.called()
      })

      it('does not report size', function () {
        expect(utils.reportSize).not.to.have.been.called()
      })

      it('yields no error, probaby no previous size', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })

    describe('when getting size of this branch errors', function () {
      beforeEach(function () {
        utils.getBuiltSizeOfBranch.withArgs('foo').yields('oops')
        utils.getBuiltAssetStats(callback)
      })

      it('does not report size', function () {
        expect(utils.reportSize).not.to.have.been.called()
      })

      it('yields an error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when all is ok', function () {
      beforeEach(function () {
        utils.getBuiltSizeOfBranch.withArgs('foo').yields(null, 666)
        utils.getBuiltAssetStats(callback)
      })

      it('reports size', function () {
        expect(utils.reportSize).to.have.been.calledOnce()
          .and.calledWithExactly(666, 777, callback)
      })
    })
  })

  describe('getCommitMessagesSinceLastRelease', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
      utils.getCommitMessagesSinceLastRelease(callback)
    })

    it('calls exec', function () {
      expect(utils.exec).to.have.been.calledOnce()
    })

    it('yields', function () {
      expect(callback).to.have.been.calledOnce()
    })
  })

  describe('tagVersion', function () {
    it('does not throw', function () {
      expect(function () {
        utils.tagVersion('foo', 'bar', callback)
      }).not.to.throw()
    })
  })

  describe('deleteTag', function () {
    it('does not throw', function () {
      expect(function () {
        utils.deleteTag('foo', callback)
      }).not.to.throw()
    })
  })

  describe('confirmOnFeatureBranch', function () {
    it('does not throw', function () {
      expect(function () {
        utils.confirmOnFeatureBranch(callback)
      }).not.to.throw()
    })
  })

  describe('getSize', function () {
    beforeEach(function () {
      sandbox.stub(console, 'info')
      sandbox.stub(console, 'warn')
    })

    it('does not throw', function () {
      expect(function () {
        utils.getSize('FILE', callback)
      }).not.to.throw()
    })
  })

  describe('reportSize', function () {
    beforeEach(function () {
      sandbox.stub(console, 'info')
      sandbox.stub(console, 'warn')
    })

    describe('when size is sligthly smaller', function () {
      beforeEach(function () {
        utils.reportSize(666, 667, callback)
      })

      it('does not log it', function () {
        expect(console.info).not.to.have.been.called()
      })

      it('does not warn us', function () {
        expect(console.warn).not.to.have.been.called()
      })
    })

    describe('when size is significantly smaller', function () {
      beforeEach(function () {
        utils.reportSize(666, 777, callback)
      })

      it('logs it in a friendly way', function () {
        expect(console.info).to.have.been.called()
      })

      it('does not warn us', function () {
        expect(console.warn).not.to.have.been.called()
      })
    })

    describe('when size is slightly bigger', function () {
      beforeEach(function () {
        utils.reportSize(667, 666, callback)
      })

      it('has no friendly message', function () {
        expect(console.info).not.to.have.been.called()
      })

      it('warns us', function () {
        expect(console.warn).to.have.been.calledOnce()
      })
    })

    describe('when size is significantly bigger', function () {
      beforeEach(function () {
        utils.reportSize(777, 666, callback)
      })

      it('warns us twice', function () {
        expect(console.warn).to.have.been.calledTwice()
      })
    })
  })

  describe('addFile', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
      utils.addFile('foo', callback)
    })

    it('executes git cmd', function () {
      expect(utils.exec).to.have.been.calledOnce()
        .and.calledWith('git add foo')
    })
  })

  describe('push', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
      utils.push(callback)
    })

    it('executes git cmd', function () {
      expect(utils.exec).to.have.been.calledOnce()
        .and.calledWith('git config --global push.default matching; git push')
    })
  })

  describe('updateChangelog', function () {
    beforeEach(function () {
      sandbox.stub(fs, 'readFile').yields(null, '# changelog etc')
      sandbox.stub(fs, 'writeFile').yields()
    })

    describe('when reading errors', function () {
      beforeEach(function () {
        fs.readFile.yields('oops')
        utils.updateChangelog('NOTES', callback)
      })

      it('tries to read the file', function () {
        expect(fs.readFile).to.have.been.calledOnce()
          .and.calledWith('CHANGELOG.md')
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when writing errors', function () {
      beforeEach(function () {
        fs.writeFile.yields('oops')
        utils.updateChangelog('NOTES', callback)
      })

      it('reads the file', function () {
        expect(fs.readFile).to.have.been.calledOnce()
          .and.calledWith('CHANGELOG.md')
      })

      it('tries to write the file', function () {
        const multilineRegex = sandbox.match(/Changelog[\s\S]+NOTES/)
        expect(fs.writeFile).to.have.been.calledOnce()
          .and.calledWith('CHANGELOG.md', multilineRegex)
      })

      it('yields the error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('oops')
      })
    })

    describe('when all is ok', function () {
      beforeEach(function () {
        utils.updateChangelog('NOTES', callback)
      })

      it('reads the file', function () {
        expect(fs.readFile).to.have.been.calledOnce()
          .and.calledWith('CHANGELOG.md')
      })

      it('writes the file', function () {
        const multilineRegex = sandbox.match(/Changelog[\s\S]+NOTES/)
        expect(fs.writeFile).to.have.been.calledOnce()
          .and.calledWith('CHANGELOG.md', multilineRegex)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })
  })

  describe('getBuiltSizeOfBranch', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'getSize').yields(null, 666)
      sandbox.stub(utils, 'getBranch').yields(null, 'foo')
    })

    it('does not throw', function () {
      expect(function () {
        utils.getBuiltSizeOfBranch('foo', callback)
      }).not.to.throw()
    })
  })

  describe('getBuiltAssetStats', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
      sandbox.stub(utils, 'getPreviousSize').yields(null, 666)
      sandbox.stub(utils, 'getBuiltSizeOfBranch').yields(null, 667)
      sandbox.stub(utils, 'getSize').yields(null, 668)
      sandbox.stub(utils, 'getBranch').yields(null, 'foo')
      sandbox.stub(utils, 'reportSize').yields()
    })

    it('does not throw', function () {
      expect(function () {
        utils.getBuiltAssetStats(callback)
      }).not.to.throw()
    })
  })

  describe('getPreviousSize', function () {
    it('does not throw', function () {
      expect(function () {
        utils.getPreviousSize(callback)
      }).not.to.throw()
    })
  })
})
