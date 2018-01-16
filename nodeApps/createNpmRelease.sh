#!/bin/bash
# Create a bundle for uploading to a github release and npm
# Requires the following env vars to be set: GITHUB_USER, GITHUB_API_TOKEN

set -e

if [ "${GITHUB_USER}" == "" ] || [ "${GITHUB_API_TOKEN}" == "" ]; then
  echo "ERROR: GitHub credentials not set."
  exit 1
fi

if [ "${NPM_AUTH}" == "" ] || [ "${NPM_NAME}" == "" ] || [ "${NPM_EMAIL}" == "" ]; then
  echo "ERROR: NPM credentials not set."
  exit 1
fi

# Check if we are on the correct branch to release from
RELEASE_BRANCH="master"
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
THIS_VERSION=`cat package.json | grep version | head -n 1 | cut -d '"' -f 4`
echo "This version: ${THIS_VERSION}"
if [ "v${THIS_VERSION}" == "${LAST_TAG}" ]; then
  echo "WARNING: Version not updated"
  exit 0
fi

git checkout ${RELEASE_BRANCH}
git branch
echo -e "_auth="${NPM_AUTH}"\ninit.author.name=${NPM_NAME}\ninit.author.email=${NPM_EMAIL}\nemail=${NPM_EMAIL}" > ~/.npmrc
npm publish

# Determine name of the project
REPO_OWNER="holidayextras"
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
  MESSAGE="NPM release via CI build: [${CIRCLE_BUILD_NUM}](https://circleci.com/gh/${APP_NAME}/${CIRCLE_BUILD_NUM})."
elif [ "${TRAVIS_JOB_NUMBER}" != "" ]; then
  MESSAGE="NPM release via CI build: [${TRAVIS_JOB_ID}](https://travis-ci.com/${APP_NAME}/jobs/${TRAVIS_JOB_ID})."
fi
echo "Message: ${MESSAGE}"

CURRENT_SHA=`git rev-parse HEAD`
echo "Latest commit is: ${CURRENT_SHA}"

# Tag this deploy and make a release in github
RELEASE_JSON="{\"tag_name\": \"v${THIS_VERSION}\",\"target_commitish\": \"${CURRENT_SHA}\",\"name\": \"v${THIS_VERSION}\",\"body\": \"${MESSAGE}\",\"draft\": false,\"prerelease\": false}"
echo "Release JSON: ${RELEASE_JSON}"
#curl -u "${GITHUB_USER}:${GITHUB_API_TOKEN}" --data "${RELEASE_JSON}" https://api.github.com/repos/${APP_NAME}/releases

echo -e "\n\nDone."
