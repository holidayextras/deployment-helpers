#!/bin/bash
set -e

GITHUB_API_TOKEN=$1
TARGET_PROJECT=$2
COMMIT_HASH=$3
EPHEMERAL_ENVIRONMENT_NAME=$4

DEPLOYMENT_RESPONSE=`curl -H "Authorization: token $GITHUB_API_TOKEN" -d '{"ref":"'"$COMMIT_HASH"'","environment":"'"$EPHEMERAL_ENVIRONMENT_NAME"'","required_contexts":[],"auto_merge":false}' "https://api.github.com/repos/$TARGET_PROJECT/deployments"`
DEPLOYMENT_ID=`echo $DEPLOYMENT_RESPONSE | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin').toString()).id"`

if [ "$DEPLOYMENT_ID" == "undefined" ]; then
  echo "Failed to register deployment with github" >&2;
  echo $DEPLOYMENT_RESPONSE >&2;
  exit 1;
fi

echo $DEPLOYMENT_ID;
