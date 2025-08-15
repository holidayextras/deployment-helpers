#!/usr/bin/env node

const publish = module.exports = {}
const path = require('path')
const fs = require('fs/promises')
const npmFetch = require('npm-registry-fetch')
const childProcess = require('child_process')
const semver = require('semver')

publish.localDir = () => {
  return process.cwd()
}

publish.run = async () => {
  try {
    if (!process.env.GITHUB_PACKAGE_TOKEN) {
      console.warn('GITHUB_PACKAGE_TOKEN is not set, skipping')
      return process.exit(1)
    }
    const dir = publish.localDir()
    const packageJson = JSON.parse(await fs.readFile(path.resolve(dir, 'package.json'), 'utf8'))
    if (!packageJson.name.includes('@holidayextras')) {
      console.warn('package name does not include @holidayextras', packageJson.name)
      return process.exit(1)
    }
    await publish.checkPackage(packageJson)
  } catch (error) {
    console.error('Error publishing package', error)
    return process.exit(1)
  }
}

publish.checkPackage = async (packageJson) => {
  const { name, version } = packageJson
  try {
    console.log('Checking package for', name, version)
    const response = await npmFetch.json(`${encodeURIComponent(name)}`, {
      '//registry.npmjs.org/:_authToken': process.env.GITHUB_PACKAGE_TOKEN
    })

    if (semver.valid(response?.['dist-tags']?.latest) && semver.valid(version) && semver.eq(version, response?.['dist-tags']?.latest)) {
      console.log('Package already exists', name, version)
      return
    }
    await publish.publishPackage(packageJson)
  } catch (error) {
    if (error.statusCode === 404) {
      await publish.publishPackage(packageJson)
    } else {
      console.log('publish.checkPackage has an error:', error)
      throw error
    }
    console.error('Error checking package', error)
  }
}

publish.publishPackage = async (packageJson) => {
  const { name, version } = packageJson
  console.log('Publishing package', name, version)
  childProcess.execSync('npm publish --access=restricted', { stdio: [0, 1, 2] })
}

(async () => {
  await publish.run()
})()
