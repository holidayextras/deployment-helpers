#!/bin/bash
SERVICE_NAME="`cat package.json | grep -m 1 name | cut -d '"' -f 4`"
IMAGE_TAG=${CIRCLE_BRANCH}
$(aws ecr get-login --region eu-west-1)

docker build -t ${SERVICE_NAME} .
docker tag ${SERVICE_NAME} ${AWS_ACCOUNT_ID}.dkr.ecr.eu-west-1.amazonaws.com/${SERVICE_NAME}:${IMAGE_TAG}
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.eu-west-1.amazonaws.com/${SERVICE_NAME}:${IMAGE_TAG}
