#!/bin/sh
docker run --init -p 25565:25565 -v ~/.aws:/root/.aws \
--env-file .env  \
mccontainer