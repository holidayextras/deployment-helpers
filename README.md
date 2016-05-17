# Deployment Helpers

This project holds various deployment scripts that are used with AWS CodeDeploy and releasing our private NPM modules.

## Node Apps

### `createPrivateRelease.sh`

This will check if the `package.json` version has been updated for a project and then create a new release on github after running `npm build` and commiting any changed release assets in the `dist` directory.

### `cachedInstallModules.sh`

This can speed up installation of node modules on hosted CI. It stores a hash of the `package.json` into the node_modules directory and uses it to determine if we may need to reinstall. Alongside this, it can automatically upgrade `npm`, and wipe out the cached node_modules directory if `package.json` has changed (to ensure unused modules are removed, and that new releases satisfying the current version range are updated to).

Use and configure with package.json:

```
  "scripts": {
    "install:cached": "git clone https://github.com/holidayextras/deployment-helpers.git && ./deployment-helpers/nodeApps/cachedInstallModules.sh"
  },
  "config": {
    "nodeModuleCaching": {
      // "clear", "prune" or omit.
      // "clear" is slower, but will pick up all available updates to modules
      // "prune" is faster, but will continue using already-cached modules if
      //   they still satisfy the range. Extraneous modules are removed.
      // If omitted, the usual approach of simply running `npm install` is used,
      // which will not install available updates or remove extraneous modules.
      "strategy": "clear",

      // Which npm version to install. Omit to use the existing default.
      "npmVersion": 3,

      // Increment this optional key to invalidate the current module cache, without
      // resorting to hacks like adding whitespace to the end of package.json
      "incrementToForceUpdate": 1
    }
  },
```

## Releasing to NPM

We currently use a combination of npm version 1 and above, because of this we can not scope the package name in the `package.json`, when a new NPM release is required please add the scope to the package name (`@holidayextras/deployment-helpers`) manually before running `npm publish`.
