const utils = require('../../src/utils')
const async = require('async')
const childProcess = require('child_process')

describe('utils', function () {
  let callback = null

  beforeEach(function () {
    callback = sandbox.stub()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('exec', function () {
    beforeEach(function () {
      sandbox.stub(childProcess, 'exec').yields(null, 'foo', 'bar')
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

  describe('checkPrerequisites', function () {
    beforeEach(function () {
      sandbox.stub(async, 'waterfall').yields()
    })

    describe('when we have a name', function () {
      beforeEach(function () {
        utils.name = 'foo'
        utils.checkPrerequisites(callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
      })
    })

    describe('when we do not have a name', function () {
      beforeEach(function () {
        utils.name = null
        utils.checkPrerequisites(callback)
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

  describe('getBranch', function () {
    it('does not throw', function () {
      expect(function () {
        utils.getBranch(callback)
      }).not.to.throw()
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
        utils.exec.yields(null, 'TAG\n')
        utils.checkAlreadyReleased(callback)
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly()
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

  describe('getBuiltSizeOfBranch', function () {
    it('does not throw', function () {
      expect(function () {
        utils.getBuiltSizeOfBranch('foo', callback)
      }).not.to.throw()
    })
  })

  describe('getBuiltAssetStats', function () {
    it('does not throw', function () {
      expect(function () {
        utils.getBuiltAssetStats(callback)
      }).not.to.throw()
    })
  })
})
