# Deployment Helpers

## Node Apps

### `createPrivateRelease.sh`

This will check if the `package.json` version has been updated for a project and then create a new release on github after running `npm build` and commiting any changed release assets in the `dist` directory.
