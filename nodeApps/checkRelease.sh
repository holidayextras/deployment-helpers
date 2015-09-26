#!/bin/bash -e

REPO_OWNER="holidayextras"
RELEASED_VERSION_STRING=`curl --user "${GHUSER}:${GHPASS}" https://api.github.com/repos/${REPO_OWNER}/${CIRCLE_PROJECT_REPONAME}/releases/latest | jq '.tag_name' | tr -d '"' | tr -d 'v'`
CANDIDATE_VERSION_STRING="`cat package.json | jq '.version' | tr -d '"' `"

echo "Current Release: $RELEASED_VERSION_STRING"
echo "Local Version: $CANDIDATE_VERSION_STRING"

RELEASED_VERSION=(${RELEASED_VERSION_STRING//./ })
CANDIDATE_VERSION=(${CANDIDATE_VERSION_STRING//./ })

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
