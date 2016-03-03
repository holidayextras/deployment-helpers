#!/bin/bash
# Create a bundle for uploading to a github release
# Requires the following env vars to be set: GITHUB_USER, GITHUB_API_TOKEN

set -e

if [ "${GITHUB_USER}" == "" ] || [ "${GITHUB_API_TOKEN}" == "" ]; then
  echo "ERROR: GitHub credentials not set."
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
LAST_TAG=`git tag --list | grep '[0-9]' | sort | tail -n 1`
echo "Last tag: ${LAST_TAG}"
THIS_VERSION=`cat package.json | grep version | cut -d '"' -f 4`
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
npm run build
git add dist
git status
if [[ -n $(git status -s) ]] ; then
  echo "Updated dist needs committing"
  git commit -m "Added new dist for version ${THIS_VERSION}"
  git push origin ${RELEASE_BRANCH}
fi

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

# Tag this deploy and make a release in github
curl -u "${GITHUB_USER}:${GITHUB_API_TOKEN}" --data "{\"tag_name\": \"v${THIS_VERSION}\",\"target_commitish\": \"${RELEASE_BRANCH}\",\"name\": \"v${THIS_VERSION}\",\"body\": \"${MESSAGE}\",\"draft\": false,\"prerelease\": false}" https://api.github.com/repos/${APP_NAME}/releases

echo -e "\n\nDone."
