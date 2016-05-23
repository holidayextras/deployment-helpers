#!/bin/bash
set -e

# Configure this script with options under a `nodeModuleCaching` 
# config key in package.json:

# config: {
#   nodeModuleCaching: {
#     ...options
#   }
# }

# You can provide a `strategy` to store a hash of the package.json
# in with the node_modules directory. If, on a repeat build, the CI
# service's cached node_modules directory contains a file matching
# the current hash, the `npm install` step can be skipped. If it
# differs we can take one of two options:

# "clear" will completely delete the node_modules directory and install
#   a fresh one if the package.json changes. This is slower, but more
#   predictable than the "prune" strategy, and will pick up updates
#   to modules that still satisfy the specified version ranges.
# "prune" will install into the cached directory then run `npm prune` to
#   remove unused modules. It is faster, but generates a less predictable
#   tree (over time) than the "clear" strategy, and will not pick up
#   updates to modules if the installed version satisfies the specified
#   version ranges.

# Empty or unknown values will simply run npm install on every build.

STRATEGY=$npm_package_config_nodeModuleCaching_strategy

# Set an `npmVersion` to install a newer npm version, like (at time of writing) npm 3.

NPM_VERSION=$npm_package_config_nodeModuleCaching_npmVersion

if [ -n "$NPM_VERSION" ]; then
  echo "npm caching: installing npm@$NPM_VERSION"
  npm install -g npm@$NPM_VERSION
fi

if [[ "$STRATEGY" == "prune" || "$STRATEGY" == "clear" ]]; then
  MODULE_HASH_FILE="./node_modules/modules.sha"
  CURRENT_SHA=`cat package.json | openssl dgst -sha256`
  if [ -f $MODULE_HASH_FILE ]; then
    CACHE_SHA=`cat $MODULE_HASH_FILE`
  fi

  echo "npm caching: comparing current package.json sha to cached sha"
  echo "cached: $CACHE_SHA, current: $CURRENT_SHA"

  if [ "$CACHE_SHA" == "$CURRENT_SHA" ]; then
    echo "npm caching: skipping install step"
  else

    if [ "$STRATEGY" == "clear" ]; then
      echo "npm caching: installing modules into empty directory"
      rm -rf node_modules
      npm install
    fi

    if [ "$STRATEGY" == "prune" ]; then
      echo "npm caching: installing modules into cached directory"
      npm install
      npm prune
    fi

    echo "npm caching: updating cache sha"
    echo $CURRENT_SHA > $MODULE_HASH_FILE
  fi

else
  echo "npm caching: defaulting to `npm install`"
  npm install
fi
