# Yet Another Minecraft Server on AWS

A simple minecraft server running in ECS, designed to be short-lived and cheap, using S3 storage that is read from/written to on startup/shutdown. Plenty of failure conditions, so not meant to be perfect.

## Getting Started

### Local installation

Requires:

- Docker
- shell environment (I used zsh on macOS)
- Local AWS credentials and an existing profile under `$HOME/.aws/credentials`

Build:

```sh
cd container
docker build -t mccontainer .
```

Create a `.env` file in the same directory, containing values for:

```text
AWS_PROFILE=
AWS_REGION=
MC_SERVER_NAME=
MC_BUCKET_NAME=
```

Run the container, assuming port `25565` is free:

```sh
./local_container.sh
```

### Deployment

Create SSM parameters:

```sh
# Create MC_SERVER_NAME parameter
aws ssm put-parameter \
    --name "/minecraft/mcServerName" \
    --type "String" \
    --value "your-server-name" \
    --overwrite

# Create MC_BUCKET_NAME parameter
aws ssm put-parameter \
    --name "/minecraft/mcBucketName" \
    --type "String" \
    --value "your-bucket-name" \
    --overwrite
```

## References

- [Graceful Container Shutdown](https://aws.amazon.com/blogs/containers/graceful-shutdowns-with-ecs/)
