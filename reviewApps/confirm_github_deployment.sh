#!/bin/bash
set -e

GITHUB_API_TOKEN=$1
TARGET_PROJECT=$2
DEPLOYMENT_ID=$3
ENVIRONMENT_URL=$4

curl -i -H "Authorization: token $GITHUB_API_TOKEN" -H 'Accept: application/vnd.github.ant-man-preview+json' -d '{"state":"success","environment_url":"'"$ENVIRONMENT_URL"'","auto_inactive":true}' "https://api.github.com/repos/$TARGET_PROJECT/deployments/$DEPLOYMENT_ID/statuses"
