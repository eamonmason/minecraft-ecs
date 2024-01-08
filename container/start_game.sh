#!/bin/bash
if [ -z ${MC_SERVER_NAME} ]; then
  echo "MC_SERVER_NAME is not set"
  exit 1
fi
if [ -z ${MC_BUCKET_NAME} ]; then
  echo "MC_BUCKET_NAME is not set"
  exit 1
fi

mkdir /mc_files
cd /mc_files
echo Retrieving the latest Minecraft server archive, ${MC_SERVER_NAME}, from S3
# list all files in the bucket matching the pattern ${MC_SERVER_NAME}-*.tar.gz and sort them by date and retrieve the most recent
MC_SERVER_ARCHIVE=$(aws s3 ls s3://${MC_BUCKET_NAME}/${MC_SERVER_NAME} --recursive | sort | tail -n 1 | awk '{print $4}')
if [ -z ${MC_SERVER_ARCHIVE} ]; then
  echo "No server archive found in S3"
  exit 1
fi
aws s3 cp s3://${MC_BUCKET_NAME}/${MC_SERVER_ARCHIVE} .
if [ $? -ne 0 ]; then
  echo "Failed to download the server archive"
  exit 1
fi
tar -xzf ${MC_SERVER_ARCHIVE}
if [ $? -ne 0 ]; then
  echo "Failed to extract the archive"
  exit 1
fi
SERVER_DIR=$(find . -maxdepth 1 -type d  | grep -vE '^.$')
cd ${SERVER_DIR}
cp /minecraft/server.jar .
cp /minecraft/eula.txt .
echo Retrieved the latest Minecraft server archive, ${MC_SERVER_ARCHIVE}, installed to /mc_files/${SERVER_DIR} from S3
# java -jar server.jar
