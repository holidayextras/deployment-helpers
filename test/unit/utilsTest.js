const utils = require('../../src/utils')
const async = require('async')
const childProcess = require('child_process')
// const git = require('simple-git')()

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

  describe('getCommitMessagesSinceLastRelease', function () {
    beforeEach(function () {
      sandbox.stub(utils, 'exec').yields()
    })

    describe('something', function () {
      beforeEach(function () {
        utils.getCommitMessagesSinceLastRelease(callback)
      })

      it('calls exec', function () {
        expect(utils.exec).to.have.been.calledOnce()
      })

      it('yields', function () {
        expect(callback).to.have.been.calledOnce()
      })
    })
  })
})
