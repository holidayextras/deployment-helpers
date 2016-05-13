#!/bin/bash -e
APP_NAME=$npm_package_name
CANDIDATE_VERSION=$npm_package_version
REPO_OWNER=`echo ${npm_package_repository_url} | cut -d/ -f4`
# if this has been run as an npm script then we have everything we need, but...
if [ -z $REPO_OWNER ] || [ -z $CANDIDATE_VERSION ] || [ -z $APP_NAME ]; then
  echo could not get env vars, are you running this as an npm script?
  # imo we should die here but, for backward compatibility
  REPO_OWNER="holidayextras"
  APP_NAME="`cat package.json | grep -m 1 name | cut -d '"' -f 4`"
  CANDIDATE_VERSION=`cat package.json | grep version | cut -d '"' -f 4`
fi
ENVIRONMENT=$1
NO_METRIC=$2

# allow the core standard of $GITHUB_USER:$GITHUB_API_TOKEN or shortbreaks' $GHUSER:$GHPASS
if [ -z $GITHUB_USER ]; then
  GITHUB_USER=$GHUSER
fi
if [ -z $GITHUB_API_TOKEN ]; then
  GITHUB_USER=$GHPASS
fi

if [ "$ENVIRONMENT" == "production" ] || [ "$ENVIRONMENT" = "master" ]; then
	# Tag this deploy and make a release in github
	curl --user "${GITHUB_USER}:${GITHUB_API_TOKEN}" --data "{\"tag_name\": \"v${CANDIDATE_VERSION}\",\"target_commitish\": \"master\",\"name\": \"v${CANDIDATE_VERSION}\",\"body\": \"Production release by @${CIRCLE_USERNAME} (via build: [${CIRCLE_BUILD_NUM}](https://circleci.com/gh/${REPO_OWNER}/${APP_NAME}/${CIRCLE_BUILD_NUM})).\",\"draft\": false,\"prerelease\": false}" https://api.github.com/repos/${REPO_OWNER}/${APP_NAME}/releases

  THIS_MAJOR_VERSION=`echo ${CANDIDATE_VERSION} | grep -E -o '^[0-9]+'`
  echo "Major version: ${THIS_MAJOR_VERSION}"
  
  # Delete current tag if any
  curl -u "${GITHUB_USER}:${GITHUB_API_TOKEN}" -X DELETE https://api.github.com/repos/${APP_NAME}/git/refs/tags/v${THIS_MAJOR_VERSION}-latest
  
  # Create a new updated tag
  curl -u "${GITHUB_USER}:${GITHUB_API_TOKEN}" --data "{\"ref\": \"refs/tags/v${THIS_MAJOR_VERSION}-latest\",\"sha\": \"${CURRENT_SHA}\"}" https://api.github.com/repos/${APP_NAME}/git/refs

fi
# Add a deployment counter in the metrics platform (graphite)
if [ -z $NO_METRIC ]; then
	echo "${GRAPHITE_API_KEY}.counters.${APP_NAME}.${ENVIRONMENT}.inf.deployment 1" | nc ${GRAPHITE_ENDPOINT_PREFIX}.carbon.hostedgraphite.com 2003
fi
