# Deployment Helpers

## Node Apps

### `createPrivateRelease.sh`

This will check if the `package.json` version has been updated for a project and then create a new release on github after running `npm build` and commiting any changed release assets in the `dist` directory.

## Releasing to NPM

We currently use a combination of npm version 1 and above, because of this we can not scope the package name in the `package.json`, when a new NPM release is required please add the scope to the package name (`@holidayextras/deployment-helpers`) manually before running `npm publish`.
