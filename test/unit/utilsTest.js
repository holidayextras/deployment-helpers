const utils = require('../../src/utils')
const path = require('path')
const childProcess = require('child_process')

describe('utils', function () {
  beforeEach(function () {
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('createVersionedFile', function () {
    let callback = null

    beforeEach(function () {
      callback = sandbox.stub()
      sandbox.stub(childProcess, 'exec')
      sandbox.stub(path, 'resolve').returns('PATH')
    })

    describe('when we have version', function () {
      beforeEach(function () {
        childProcess.exec.yields(null)
        process.env.npm_package_version = 'VERSION'
        utils.createVersionedDistFile('foo.js', callback)
      })

      it('copies the file', function () {
        expect(childProcess.exec).to.have.been.calledOnce()
          .and.calledWith('cp PATH/foo.js PATH/foo.VERSION.js')
      })

      it('yields versioned file name', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(null, 'foo.VERSION.js')
      })
    })

    describe('when we do not have version', function () {
      beforeEach(function () {
        childProcess.exec.yields(null)
        delete process.env.npm_package_version
        utils.createVersionedDistFile('foo.js', callback)
      })

      it('does not copy the file', function () {
        expect(childProcess.exec).not.to.have.been.called()
      })

      it('yields an error', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(sandbox.match.string)
      })
    })
  })

  describe('getIntegrity', function () {
    let callback = null

    beforeEach(function () {
      callback = sandbox.stub()
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
    let callback = null

    beforeEach(function () {
      callback = sandbox.stub()
      sandbox.stub(path, 'resolve')
      sandbox.stub(childProcess, 'exec').yields(null, 'SIGNATURE')
    })

    describe('when signature is ok', function () {
      beforeEach(function () {
        childProcess.exec.yields(null, 'SIGNATURE')
        utils.getSignature('foo', callback)
      })

      it('yields integrity value', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly(null, 'SIGNATURE')
      })
    })

    describe('when signature errors', function () {
      beforeEach(function () {
        childProcess.exec.yields('OOPS')
        utils.getSignature('foo', callback)
      })

      it('yields error only', function () {
        expect(callback).to.have.been.calledOnce()
          .and.calledWithExactly('OOPS')
      })
    })
  })
})
