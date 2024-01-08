#!/usr/bin/env bash
source .env

# Start EC2 server instance
MC_SERVER_INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=${MC_SERVER_NAME}" --query 'Reservations[0].Instances[0].InstanceId' --output text)
aws ec2 start-instances --instance-ids ${MC_SERVER_INSTANCE_ID}

# update route53 to point to server and client
sleep 10
MY_IP=$(curl ifconfig.co)
SERVER_IP=$(aws ec2 describe-instances --instance-ids ${MC_SERVER_INSTANCE_ID} --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
echo Client IP: ${MY_IP}
echo MC Server IP: ${SERVER_IP}

cat <<EOT > records-changed.json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${MC_HOST_NAME}",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "${SERVER_IP}"
          }
        ]
      }
    }
  ]
}
EOT

aws route53 change-resource-record-sets --hosted-zone-id ${DNS_ZONE_ID} --change-batch file://records-changed.json
