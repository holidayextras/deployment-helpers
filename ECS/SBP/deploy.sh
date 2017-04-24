#!/bin/bash

while getopts ":c:m:p:" opt; do
  case $opt in
    c) CPU="$OPTARG"
    ;;
    m) MEMORY="$OPTARG"
    ;;
    p) PORT="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    ;;
  esac
done

echo "CPU=${CPU}"
echo "MEMORY=${MEMORY}"
echo "PORT=${PORT}"

VPC_ID="vpc-9f48f7fa"
VPC_SUBNETS="subnet-7916a320 subnet-a69af1c3 subnet-e1a03396"
VPC_SECURITY_GROUPS="sg-cad732ad"

SERVICE_NAME="`cat package.json | grep -m 1 name | cut -d '"' -f 4`"
CLUSTER_NAME="SBP-Cluster-1"
DESIRED_COUNT=1
IMAGE_TAG=${CIRCLE_SHA1:-latest}
TEMPLATE_FILE="ecs-task-definition"
$(aws ecr get-login --region eu-west-1)
ECR_REPOS=`aws ecr describe-repositories --output text --query repositories[*].repositoryName`

if [[ ${ECR_REPOS} != *"${SERVICE_NAME}"* ]]; then
	echo "REPOSITORY: `aws ecr create-repository --repository-name ${SERVICE_NAME} --query repository.repositoryUri --output text`"
fi

docker build -t ${SERVICE_NAME} .
docker tag ${SERVICE_NAME} ${AWS_ACCOUNT_ID}.dkr.ecr.eu-west-1.amazonaws.com/${SERVICE_NAME}:${IMAGE_TAG}
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.eu-west-1.amazonaws.com/${SERVICE_NAME}:${IMAGE_TAG}

if [ -n "${PORT}" ]; then
	TEMPLATE_FILE="ecs-task-definition-exposedPorts"
fi
sed -e "s;%SERVICE_NAME%;${SERVICE_NAME};g" -e "s;%IMAGE_TAG%;${IMAGE_TAG};g" -e "s;%PORT%;${PORT};g" -e "s;%AWS_ACCOUNT_ID%;${AWS_ACCOUNT_ID};g" -e "s;%CPU%;${CPU};g" -e "s;%MEMORY%;${MEMORY};g" ${TEMPLATE_FILE}.json > taskDefinition.json
echo "TASK: `aws ecs register-task-definition --family ${SERVICE_NAME} --cli-input-json file://taskDefinition.json --query taskDefinition.status --output text`"

TASK_REVISION=`aws ecs describe-task-definition --task-definition ${SERVICE_NAME} --query taskDefinition.revision --output text`
SERVICE_RESPONSE=`aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --query failures[0].reason --output text`
echo "SERVICE_RESPONSE: ${SERVICE_RESPONSE}"
if [[ ${SERVICE_RESPONSE} = "MISSING" ]]; then
	if [ -z "${PORT}" ]; then
		echo "SERVICE: `aws ecs create-service --cluster ${CLUSTER_NAME} --task-definition ${SERVICE_NAME}:${TASK_REVISION} --desired-count ${DESIRED_COUNT} --service-name ${SERVICE_NAME} --query service.status --output text`"
	else
		ALB_ARN=`aws elbv2 create-load-balancer --name ${SERVICE_NAME} --subnets ${VPC_SUBNETS} --security-groups ${VPC_SECURITY_GROUPS} --query LoadBalancers[0].LoadBalancerArn --output text`
		echo "ALB_ARN: ${ALB_ARN}"
		TARGET_ARN=`aws elbv2 create-target-group --name ${SERVICE_NAME} --protocol HTTP --port 80 --vpc-id ${VPC_ID} --query TargetGroups[0].TargetGroupArn --output text`
		echo "TARGET_ARN: ${TARGET_ARN}"		
		echo "CREATE_LISTNER: `aws elbv2 create-listener --load-balancer-arn ${ALB_ARN} --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=${TARGET_ARN} --query Listners[0].ListnerArn --output text`"
		echo "SERVICE: `aws ecs create-service --cluster ${CLUSTER_NAME} --task-definition ${SERVICE_NAME}:${TASK_REVISION} --desired-count ${DESIRED_COUNT} --service-name ${SERVICE_NAME} --role ecsServiceRole --load-balancers targetGroupArn=${TARGET_ARN},containerName=${SERVICE_NAME},containerPort=${PORT} --query service.status --output text`"
		echo "Application URL: http://`aws elbv2 describe-load-balancers --load-balancer-arns ${ALB_ARN} --query LoadBalancers[0].DNSName --output text`"
	fi
else
	echo "UPDATE_SERVICE: `aws ecs update-service --cluster ${CLUSTER_NAME} --task-definition ${SERVICE_NAME}:${TASK_REVISION} --desired-count ${DESIRED_COUNT} --service ${SERVICE_NAME} --query service.status --output text`"
fi
