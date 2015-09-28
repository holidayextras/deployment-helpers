#!/bin/bash -e
APP_NAME="`cat ../../../package.json | jq '.name' | tr -d '"'`"
CANDIDATE_VERSION=`cat ../../../package.json | jq '.version' | tr -d '"'`
REPO_OWNER="holidayextras"
ENVIRONMENT=$1

if [ $ENVIRONMENT === "production" ]; then
	curl --user "${GHUSER}:${GHPASS}" --data "{\"tag_name\": \"v${CANDIDATE_VERSION}\",\"target_commitish\": \"master\",\"name\": \"v${CANDIDATE_VERSION}\",\"body\": \"Production release by @${CIRCLE_USERNAME} (via build: [${CIRCLE_BUILD_NUM}](https://circleci.com/gh/${REPO_OWNER}/${CIRCLE_PROJECT_REPONAME}/${CIRCLE_BUILD_NUM})).\",\"draft\": false,\"prerelease\": false}" https://api.github.com/repos/${REPO_OWNER}/${CIRCLE_PROJECT_REPONAME}/releases
fi
echo "${GRAPHITE_API_KEY}.counters.${APP_NAME}.${ENVIRONMENT}.inf.deployment 1" | nc ${GRAPHITE_ENDPOINT_PREFIX}.carbon.hostedgraphite.com 2003
