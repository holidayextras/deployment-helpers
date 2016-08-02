#!/bin/bash
# Create a bundle for uploading to a github release
# Requires the following env vars to be set: GITHUB_USER, GITHUB_API_TOKEN

set -e

ENVIRONMENT=$1
NO_METRIC=$2
if [ $DEBUG != "" ]; then
  SAFE_DEBUG_ECHO=echo
fi

# allow the core standard of $GITHUB_USER:$GITHUB_API_TOKEN or shortbreaks' $GHUSER:$GHPASS
if [ -z $GITHUB_USER ]; then
  GITHUB_USER=$GHUSER
fi
if [ -z $GITHUB_API_TOKEN ]; then
  GITHUB_API_TOKEN=$GHPASS
fi
if [ "${GITHUB_USER}" == "" ] || [ "${GITHUB_API_TOKEN}" == "" ]; then
  echo "ERROR: GitHub credentials not set."
  exit 1
elif [ "${CIRCLECI}" != "" ] && [ "${GITHUB_EMAIL}" == "" ]; then
  echo "ERROR: GitHub Email required for CircleCI"
  exit 3
fi

# Setup git CLI if needed
if [ "`git config --get user.email`" == "" ]; then
  git config user.email ${GITHUB_EMAIL}
fi
if [ "`git config --get user.name`" == "" ]; then
  git config user.name ${GITHUB_USER}
fi

# Check if we are on the correct branch to release from
if [ "${RELEASE_BRANCH}" == "" ]; then
  RELEASE_BRANCH="master"
fi
if [ "${TRAVIS_BRANCH}" != "" ]; then
  CURRENT_BRANCH=${TRAVIS_BRANCH}
else
  CURRENT_BRANCH=`git rev-parse --abbrev-ref HEAD`
fi
echo "Current branch: ${CURRENT_BRANCH}"
if [ "${CURRENT_BRANCH}" != "${RELEASE_BRANCH}" ]; then
  echo "ERROR: Not on ${RELEASE_BRANCH} branch"
  exit 2
fi

# Check if we have not release this version already
git pull
LAST_TAG=`git tag --list | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort | tail -n 1`
echo "Last tag: ${LAST_TAG}"
THIS_VERSION=${npm_package_version}
if [ "v${THIS_VERSION}" == "" ]; then
  THIS_VERSION=`cat package.json | grep version | head -n 1 | cut -d '"' -f 4`
fi
echo "This version: ${THIS_VERSION}"
if [ "v${THIS_VERSION}" == "${LAST_TAG}" ]; then
  echo "WARNING: Version not updated"
  exit 0
fi

git checkout ${RELEASE_BRANCH}
git branch
if [ -d dist ]; then
  git rm dist -r
fi
npm run build || echo "npm run build failed, but maybe there is no build script?"
# If a new dist dir has been built we may need to commit it
if [ -d dist ]; then
  git add dist
  git status
  if [[ -n $(git status -s) ]] ; then
    echo "Updated dist needs committing"
    git commit -m "Added new dist for version ${THIS_VERSION}"
    git push origin ${RELEASE_BRANCH}
  fi
fi

# Determine name of the project
REPO_OWNER=`echo "${npm_package_repository_url}" | cut -d/ -f4`
# if this has been run as an npm script then we have everything we need, but...
if [ -z $REPO_OWNER ]; then
  echo could not get env vars, are you running this as an npm script?
  # imo we should die here but, for backward compatibility
  REPO_OWNER="holidayextras"
fi
if [ "${CIRCLE_BUILD_NUM}" != "" ]; then
  APP_NAME="${REPO_OWNER}/${CIRCLE_PROJECT_REPONAME}"
elif [ "${TRAVIS_JOB_NUMBER}" != "" ]; then
  APP_NAME=${TRAVIS_REPO_SLUG}
else
  WD=`pwd`
  BASENAME=`basename ${WD}`
  APP_NAME="${REPO_OWNER}/${BASENAME}"
fi

# Set a sensible release message
MESSAGE="NPM release by developer."
if [ "${CIRCLE_BUILD_NUM}" != "" ]; then
  MESSAGE="NPM release by ${CIRCLE_USERNAME} via CI build: [${CIRCLE_BUILD_NUM}](https://circleci.com/gh/${APP_NAME}/${CIRCLE_BUILD_NUM})."
elif [ "${TRAVIS_JOB_NUMBER}" != "" ]; then
  MESSAGE="NPM release via CI build: [${TRAVIS_JOB_ID}](https://travis-ci.com/${APP_NAME}/jobs/${TRAVIS_JOB_ID})."
fi
echo "Message: ${MESSAGE}"

CURRENT_SHA=`git rev-parse HEAD`
echo "Latest commit is: ${CURRENT_SHA}"

# Tag this deploy and make a release in github
RELEASE_JSON="{\"tag_name\": \"v${THIS_VERSION}\",\"target_commitish\": \"${CURRENT_SHA}\",\"name\": \"v${THIS_VERSION}\",\"body\": \"${MESSAGE}\",\"draft\": false,\"prerelease\": false}"
echo "Release JSON: ${RELEASE_JSON}"
$SAFE_DEBUG_ECHO curl -u "${GITHUB_USER}:${GITHUB_API_TOKEN}" --data "${RELEASE_JSON}" https://api.github.com/repos/${APP_NAME}/releases

# Now update the major release tag

THIS_MAJOR_VERSION=`echo ${THIS_VERSION} | grep -E -o '^[0-9]+'`
echo "Major version: ${THIS_MAJOR_VERSION}"

# Delete current tag if any
$SAFE_DEBUG_ECHO curl -u "${GITHUB_USER}:${GITHUB_API_TOKEN}" -X DELETE https://api.github.com/repos/${APP_NAME}/git/refs/tags/v${THIS_MAJOR_VERSION}-latest

# Create a new updated tag
$SAFE_DEBUG_ECHO curl -u "${GITHUB_USER}:${GITHUB_API_TOKEN}" --data "{\"ref\": \"refs/tags/v${THIS_MAJOR_VERSION}-latest\",\"sha\": \"${CURRENT_SHA}\"}" https://api.github.com/repos/${APP_NAME}/git/refs

# Add a deployment counter in the metrics platform (graphite)
if [ "$ENVIRONMENT" != "" } && [ "${GRAPHITE_API_KEY}" != "" ] && [ -z $NO_METRIC ]; then
  if [ $DEBUG != "" ]; then
    echo "${GRAPHITE_API_KEY}.counters.${BASE_NAME}.${ENVIRONMENT}.inf.deployment 1 |"
  fi
  echo "${GRAPHITE_API_KEY}.counters.${BASE_NAME}.${ENVIRONMENT}.inf.deployment 1" | $SAFE_DEBUG_ECHO nc ${GRAPHITE_ENDPOINT_PREFIX}.carbon.hostedgraphite.com 2003
fi

echo -e "\n\nDone."
