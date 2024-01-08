#!/bin/bash
if [ -z ${MC_BUCKET_NAME} ]; then
  echo "MC_BUCKET_NAME is not set"
  exit 1
fi

cd /mc_files
SERVER_DIR=$(find . -maxdepth 1 -type d  | grep -vE '^.$')
cp -r ${SERVER_DIR} /tmp
cd /tmp/${SERVER_DIR}
rm -fr versions libraries crash-reports logs server.jar
cd ..
DATE_TIME=$(date +%Y%m%d%H%M)
tar -czf ${SERVER_DIR}-${DATE_TIME}.tar.gz ${SERVER_DIR}
aws s3 cp ${SERVER_DIR}-${DATE_TIME}.tar.gz s3://${MC_BUCKET_NAME}/
