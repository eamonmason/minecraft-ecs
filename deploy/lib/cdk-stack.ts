import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as dotenv from 'dotenv';
import * as logs from 'aws-cdk-lib/aws-logs';

dotenv.config();

export class MinecraftEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'MinecraftVpc', {
      maxAzs: 2
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'MinecraftCluster', {
      vpc: vpc
    });

    // ECR Repository
    const repository = ecr.Repository.fromRepositoryName(this, 'MinecraftRepository', 'minecraft-ecs');
    
    const mcServerSSM = ssm.StringParameter.fromStringParameterName(
      this,
      'McServerNameParameter',
      '/minecraft/mcServerName'
    );
    
    const mcBucketSSM = ssm.StringParameter.fromStringParameterName(
      this,
      'McBucketNameParameter',
      '/minecraft/mcBucketName'
    );

    // ECS Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'MinecraftTaskDef', {
      cpu: 2048,
      memoryLimitMiB: 8192
    });

    const logGroup = new logs.LogGroup(this, 'MinecraftLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK
    });
    
    const container = taskDefinition.addContainer('MinecraftContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      memoryLimitMiB: 8192,
      cpu: 1024, // 1 vCPU
      logging: ecs.LogDrivers.awsLogs({ 
        streamPrefix: 'Minecraft',
        logGroup: logGroup
      }),      
      environment: {        
        MC_SERVER_NAME: mcServerSSM.stringValue,
        MC_BUCKET_NAME: mcBucketSSM.stringValue
      }      
    });

    container.addPortMappings({
      containerPort: 25565
    });

    // Add IAM policy to the task role
    taskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:ListBucket'
      ],
      resources: [
        `arn:aws:s3:::minecraft-server-backup`,
        `arn:aws:s3:::minecraft-server-backup/*`
      ]
    }));

    // Add SSM read permissions to the task role
    taskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [
        mcServerSSM.parameterArn,
        mcBucketSSM.parameterArn
      ]
    }));

    // Security Group
    const securityGroup = new ec2.SecurityGroup(this, 'MinecraftSecurityGroup', {
      vpc,
      allowAllOutbound: true
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(25565), 'Allow Minecraft traffic');

    // ECS Service
    const service = new ecs.FargateService(this, 'MinecraftService', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [securityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      }
    });

    // Route 53 Hosted Zone
    const domainName = process.env.DOMAIN_NAME || 'acme.com';
    const hostName = process.env.HOST_NAME || 'minecraft';
    const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName });

    // Store environment variables in Parameter Store
    new ssm.StringParameter(this, 'ZoneIdParameter', {
      parameterName: '/minecraft/zoneId',
      stringValue: zone.hostedZoneId
    });

    new ssm.StringParameter(this, 'RecordNameParameter', {
      parameterName: '/minecraft/recordName',
      stringValue: `${hostName}`
    });

    // Lambda function to update Route 53
    const updateDnsLambda = new nodejs.NodejsFunction(this, 'UpdateDnsLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(60),
      logRetention: logs.RetentionDays.ONE_WEEK // Set log retention to 7 days
    });

    // Grant necessary permissions to the Lambda function
    updateDnsLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'route53:ChangeResourceRecordSets',
        'ecs:DescribeTasks',
        'ec2:DescribeNetworkInterfaces',
        'ssm:GetParameter'
      ],
      resources: ['*']
    }));

    // EventBridge rule to trigger the Lambda function on ECS task state change
    const rule = new events.Rule(this, 'EcsTaskStateChangeRule', {
      eventPattern: {
        source: ['aws.ecs'],
        detailType: ['ECS Task State Change'],
        detail: {
          clusterArn: [cluster.clusterArn],
          lastStatus: ['RUNNING']
        }
      }
    });

    rule.addTarget(new targets.LambdaFunction(updateDnsLambda));
  }
}
