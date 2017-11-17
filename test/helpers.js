const chai = require('chai')

chai.config.includeStack = true

chai.use(require('dirty-chai'))
chai.use(require('sinon-chai'))

global.expect = chai.expect

global.sinon = require('sinon')
global.sandbox = global.sinon.sandbox.create()
