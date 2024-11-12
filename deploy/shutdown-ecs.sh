#!/bin/bash


# Set AWS region
AWS_REGION="eu-west-2"

# Destroy the CDK stack without confirmation
cdk destroy --force --region "$AWS_REGION"