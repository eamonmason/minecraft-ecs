// import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MinecraftEcsStack } from '../lib/cdk-stack';

const app = new cdk.App();
new MinecraftEcsStack(app, 'MinecraftEcsStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
