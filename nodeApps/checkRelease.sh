#!/bin/bash -e

CANDIDATE_VERSION="`cat package.json | jq '.version' | tr -d '"' `"
RELEASED_VERSION=`curl --user "${GHUSER}:${GHPASS}" https://api.github.com/repos/${REPO_OWNER}/}/${CIRCLE_PROJECT_REPONAME}/releases/latest | jq '.tag_name' | tr -d '"' | tr -d 'v'`

echo "Current Release: $RELEASE"
echo "Local Version: $APP_VERSION"

CANDIDATE_VERSION=(${CANDIDATE_VERSION//./ })
RELEASED_VERSION=(${RELEASED_VERSION//./ })

if [ ${CANDIDATE_VERSION[0]} -lt ${RELEASED_VERSION[0]} ]; then
	exit 1
fi

if [ ${CANDIDATE_VERSION[0]} -le ${RELEASED_VERSION[0]} ] && [ ${CANDIDATE_VERSION[1]} -lt ${RELEASED_VERSION[1]} ]; then
	exit 1
fi

if [ ${CANDIDATE_VERSION[0]} -le ${RELEASED_VERSION[0]} ] && [ ${CANDIDATE_VERSION[1]} -le ${RELEASED_VERSION[1]} ] && [ ${CANDIDATE_VERSION[2]} -le ${RELEASED_VERSION[2]} ]; then
	exit 1
fi
exit 0
