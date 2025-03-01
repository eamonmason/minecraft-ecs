#!/bin/bash


# Check if the correct number of arguments is provided
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <minecraft-world>"
  exit 1
fi

# Set variables
source .env
MINECRAFT_WORLD=$1
SSM_PARAMETER_NAME="/minecraft/mcServerName"

# Update the SSM parameter
aws ssm put-parameter --name "$SSM_PARAMETER_NAME" --value "$MINECRAFT_WORLD" --type String --overwrite --region "$AWS_REGION"

# Deploy the CDK stack without confirmation
cdk deploy --require-approval never --region "$AWS_REGION"