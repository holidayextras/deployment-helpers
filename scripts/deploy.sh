#!/bin/bash

set -e

if [ ${CI_BRANCH} == 'staging' ]; then
  git branch
  echo we should be on staging are we in detached state?
  grep version package.json
  git diff staging --stat
  git checkout staging
  grep version package.json
  BUILT_ASSET=dist/module/utils.js npm run release
fi
