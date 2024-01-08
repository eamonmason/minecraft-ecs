# Stop EC2 Minecraft server instance and Win VDI
source .env
aws ec2 stop-instances --instance-ids $(aws ec2 describe-instances --filters "Name=tag:Name,Values=Minecraft Server" --query 'Reservations[0].Instances[0].InstanceId' --output text)
