// utils for building, not needed in the built output

const path = require('path')
const childProcess = require('child_process')

const devUtils = module.exports = {}

devUtils.getIntegrity = (file, callback) => {
  devUtils.getSignature(file, (err, signature) => {
    if (err) return callback(err)
    callback(null, 'sha256-' + signature)
  })
}

devUtils.createVersionedDistFile = (file, callback) => {
  if (!process.env.npm_package_version) return callback('Version missing - must run this as an npm script')
  const versionedFile = file.replace('.js', `.${process.env.npm_package_version}.js`)
  const distPath = path.resolve(__dirname, '../dist')
  const cmd = `cp ${distPath}/${file} ${distPath}/${versionedFile}`
  childProcess.exec(cmd, err => {
    callback(err, versionedFile)
  })
}

devUtils.getSignature = (file, callback) => {
  const distPath = path.resolve(__dirname, '../dist')
  const cmd = `cat ${distPath}/${file} | openssl dgst -sha256 -binary | openssl enc -base64 -A`
  childProcess.exec(cmd, callback)
}