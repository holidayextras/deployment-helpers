#!/bin/bash -e
APP_NAME="`cat package.json | grep -m 1 name | cut -d '"' -f 4`"
CANDIDATE_VERSION=`cat package.json | grep version | cut -d '"' -f 4`
REPO_OWNER="holidayextras"
ENVIRONMENT=$1
NO_METRIC=$2

if [ $ENVIRONMENT = "production" ] || [ $ENVIRONMENT = "master" ]; then
	# Tag this deploy and make a release in github
	if [ $CI_PLATFORM = 'dockyard' ] ;  then
		curl --user "${GHUSER}:${GHPASS}" --data  "{\"tag_name\": \"v${CANDIDATE_VERSION}\",\"target_commitish\": \"master\",\"name\": \"v${CANDIDATE_VERSION}\",\"body\": \"Production release by HXCi (via build: [${CI_BUILD_ID}](https://ci.dock-yard.io/${CI_REPO_NAME}/${CI_BUILD_ID})).\",\"draft\": false,\"prerelease\": false}" https://api.github.com/repos/${REPO_OWNER}/${CI_REPO_NAME}/releases
	else
		curl --user "${GHUSER}:${GHPASS}" --data  "{\"tag_name\": \"v${CANDIDATE_VERSION}\",\"target_commitish\": \"master\",\"name\": \"v${CANDIDATE_VERSION}\",\"body\": \"Production release by @${CIRCLE_USERNAME} (via build: [${CIRCLE_BUILD_NUM}](https://circleci.com/gh/${REPO_OWNER}/${CIRCLE_PROJECT_REPONAME}/${CIRCLE_BUILD_NUM})).\",\"draft\": false,\"prerelease\": false}" https://api.github.com/repos/${REPO_OWNER}/${CIRCLE_PROJECT_REPONAME}/releases
	fi
fi
# Add a deployment counter in the metrics platform (graphite)
if [ -z $NO_METRIC ]; then
	echo "${GRAPHITE_API_KEY}.counters.${APP_NAME}.${ENVIRONMENT}.inf.deployment 1" | nc ${GRAPHITE_ENDPOINT_PREFIX}.carbon.hostedgraphite.com 2003
fi
