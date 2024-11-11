const AWS = require('aws-sdk');
const ssm = new AWS.SSM();
const route53 = new AWS.Route53();
const ecs = new AWS.ECS();

exports.handler = async (event) => {
  const clusterArn = event.detail.clusterArn;
  const taskArn = event.detail.taskArn;

  // Retrieve environment variables from Parameter Store
  const zoneId = (await ssm.getParameter({ Name: '/minecraft/zoneId' }).promise()).Parameter.Value;
  const recordName = (await ssm.getParameter({ Name: '/minecraft/recordName' }).promise()).Parameter.Value;

  const describeTasksResponse = await ecs.describeTasks({
    cluster: clusterArn,
    tasks: [taskArn]
  }).promise();

  const task = describeTasksResponse.tasks[0];
  const eni = task.attachments[0].details.find(detail => detail.name === 'networkInterfaceId').value;
  const ec2 = new AWS.EC2();
  const describeNetworkInterfacesResponse = await ec2.describeNetworkInterfaces({
    NetworkInterfaceIds: [eni]
  }).promise();

  const publicIp = describeNetworkInterfacesResponse.NetworkInterfaces[0].Association.PublicIp;

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

  await route53.changeResourceRecordSets(params).promise();
};