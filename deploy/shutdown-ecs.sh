#!/bin/bash


# Set AWS region
source .env

# Set ECS cluster and service names based on naming convention
ECS_CLUSTER_ARN=$(aws ecs list-clusters --region "$AWS_REGION" --query "clusterArns" --output text | grep MinecraftCluster)
ECS_SERVICE_ARN=$(aws ecs list-services --cluster "$ECS_CLUSTER_ARN" --region "$AWS_REGION" --query "serviceArns" --output text | grep MinecraftService)

# Update the ECS service to set desired count to zero
aws ecs update-service --cluster "$ECS_CLUSTER_ARN" --service "$ECS_SERVICE_ARN" --desired-count 0 --region "$AWS_REGION"

# Wait for the service to scale down to zero tasks
aws ecs wait services-stable --cluster "$ECS_CLUSTER_ARN" --services "$ECS_SERVICE_ARN" --region "$AWS_REGION"

# Destroy the CDK stack without confirmation
cdk destroy --force --region "$AWS_REGION"