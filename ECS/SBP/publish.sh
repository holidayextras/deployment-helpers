#!/bin/bash
echo "CIRCLE_BRANCH: ${CIRCLE_BRANCH}"
echo "CI_PULL_REQUESTS: ${CI_PULL_REQUESTS}"
if [ ${CIRCLE_BRANCH} = "master" ] || [ ${CIRCLE_BRANCH} = "staging" ] || [ -z ${CI_PULL_REQUESTS} ]; then
	SERVICE_NAME="`cat package.json | grep -m 1 name | cut -d '"' -f 4`"
	IMAGE_TAG=$1
	$(aws ecr get-login --region eu-west-1  --no-include-email)

	docker build -t ${SERVICE_NAME} .
	docker tag ${SERVICE_NAME} ${AWS_ACCOUNT_ID}.dkr.ecr.eu-west-1.amazonaws.com/${SERVICE_NAME}:${IMAGE_TAG}
	docker push ${AWS_ACCOUNT_ID}.dkr.ecr.eu-west-1.amazonaws.com/${SERVICE_NAME}:${IMAGE_TAG}
fi
