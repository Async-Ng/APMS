#!/usr/bin/env node
import "dotenv/config";

import * as cdk from "aws-cdk-lib/core";

import { InfrastructureStack } from "../lib/infrastructure-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

new InfrastructureStack(app, "InfrastructureStack", {
  ...(account && region
    ? { env: { account, region } }
    : {}),
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

});
