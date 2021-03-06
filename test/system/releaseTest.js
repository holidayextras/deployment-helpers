const utils = require('../../src/utils')
const fs = require('fs')

describe('release', function () {
  let env = null

  before(function () {
    sandbox.stub(fs, 'stat').yields(null, { size: 666 })
    sandbox.stub(fs, 'writeFile').yields(null, 'ok')
    sandbox.stub(fs, 'readFile').yields(null, 'ok')
    sandbox.stub(console, 'info')
    sandbox.spy(console, 'warn')
    sandbox.stub(utils, 'exec').yields()
    utils.exec.withArgs('git rev-parse --abbrev-ref HEAD').yields(null, 'master')
    sandbox.stub(utils, 'labelPullRequestWithMetricMovement').resolves()
    env = JSON.parse(JSON.stringify(process.env))
  })

  after(function () {
    process.env = JSON.parse(JSON.stringify(env))
    sandbox.restore()
  })

  describe('when all is ok', function () {
    before(function (done) {
      /*  If I try to test this with
          childProcess.execFile('nodeApps/release, callback)
          then I can't stub the methods inside.
          I would have to make the script more complex to be able to test it,
          so setting a timeout seems the best way.
          I don't think we normally test things like this, the thing it is
          replacing does not have a test like this.
      */
      process.env.GITHUB_EMAIL = 'foo@bar.com'
      require('../../nodeApps/release')
      setTimeout(done, 1000)
    })

    it('calls exec', function () {
      expect(utils.exec).to.have.been.called()
    })

    it('tells us it is "done"', function () {
      expect(console.info).to.have.been.calledOnce()
        .and.calledWithExactly('done')
    })
  })
})
