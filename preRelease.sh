#!/bin/bash -e

REPO_OWNER="holidayextras"
# Get the last version from Github
RELEASED_VERSION_STRING=`curl --user "${GHUSER}:${GHPASS}" https://api.github.com/repos/${REPO_OWNER}/${CIRCLE_PROJECT_REPONAME}/releases/latest | jq '.tag_name' | tr -d '"' | tr -d 'v'`
# Get the version from the local package.json
CANDIDATE_VERSION_STRING="`cat package.json | jq '.version' | tr -d '"' `"

echo "Current Release: $RELEASED_VERSION_STRING"
echo "Local Version: $CANDIDATE_VERSION_STRING"

# Split the string up into an array
RELEASED_VERSION=(${RELEASED_VERSION_STRING//./ })
CANDIDATE_VERSION=(${CANDIDATE_VERSION_STRING//./ })

# Check if the major is less than
if [ ${CANDIDATE_VERSION[0]} -lt ${RELEASED_VERSION[0]} ]; then
	# e.g. 1.0.0 < 2.0.0
	exit 1
fi
# Check if the major is less than or equal and if the minor is less than
if [ ${CANDIDATE_VERSION[0]} -le ${RELEASED_VERSION[0]} ] && [ ${CANDIDATE_VERSION[1]} -lt ${RELEASED_VERSION[1]} ]; then
	# e.g. 1.0.0 < 1.1.0
	exit 1
fi
# Check if the major is less than or equal and if the minor is less than or equal and if the patch is less than or equal
if [ ${CANDIDATE_VERSION[0]} -le ${RELEASED_VERSION[0]} ] && [ ${CANDIDATE_VERSION[1]} -le ${RELEASED_VERSION[1]} ] && [ ${CANDIDATE_VERSION[2]} -le ${RELEASED_VERSION[2]} ]; then
	# e.g. 1.0.0 < 1.0.1
	exit 1
fi
exit 0
