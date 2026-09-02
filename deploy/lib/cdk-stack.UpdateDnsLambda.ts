const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { Route53Client, ChangeResourceRecordSetsCommand } = require('@aws-sdk/client-route-53');
const { ECSClient, DescribeTasksCommand } = require('@aws-sdk/client-ecs');
const { EC2Client, DescribeNetworkInterfacesCommand } = require('@aws-sdk/client-ec2');

const ssm = new SSMClient({});
const route53 = new Route53Client({});
const ecs = new ECSClient({});
const ec2 = new EC2Client({});

exports.handler = async (event) => {
  const clusterArn = event.detail.clusterArn;
  const taskArn = event.detail.taskArn;

  // Retrieve environment variables from Parameter Store
  const zoneId = (await ssm.send(new GetParameterCommand({ Name: '/minecraft/zoneId' }))).Parameter.Value;
  const recordName = (await ssm.send(new GetParameterCommand({ Name: '/minecraft/recordName' }))).Parameter.Value;
  console.log(`Updating DNS record for ${recordName} in zone ${zoneId}`);

  const describeTasksResponse = await ecs.send(new DescribeTasksCommand({
    cluster: clusterArn,
    tasks: [taskArn]
  }));

  const task = describeTasksResponse.tasks[0];
  const eni = task.attachments[0].details.find(detail => detail.name === 'networkInterfaceId').value;
  console.log(`Found ENI ${eni}`);
  const describeNetworkInterfacesResponse = await ec2.send(new DescribeNetworkInterfacesCommand({
    NetworkInterfaceIds: [eni]
  }));

  const publicIp = describeNetworkInterfacesResponse.NetworkInterfaces[0].Association.PublicIp;
  console.log(`Found public IP ${publicIp}`);
  const params = {
    HostedZoneId: zoneId,
    ChangeBatch: {
      Changes: [{
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: recordName,
          Type: 'A',
          TTL: 300,
          ResourceRecords: [{ Value: publicIp }]
        }
      }]
    }
  };
  console.log(`Updating DNS record for ${recordName} to ${publicIp}`);
  await route53.send(new ChangeResourceRecordSetsCommand(params));
};
