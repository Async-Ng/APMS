import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";

function parseEnvList(value: string | undefined): string[] | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : undefined;
}

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // =========================================================================
    // 1. KHỞI TẠO AMAZON S3 BUCKET (QUẢN LÝ TÀI LIỆU)
    // =========================================================================
    const documentBucket = new s3.Bucket(this, "APMSDocumentBucket", {
      // Tự động sinh tên unique kèm hậu tố để tránh trùng lặp global
      bucketName: `apms-documents-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,

      // Bật tính năng mã hóa dữ liệu phía Server (Best Practice)
      encryption: s3.BucketEncryption.S3_MANAGED,

      // Chặn hoàn toàn quyền truy cập công khai (Multi-tenancy isolation)
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // CẤU HÌNH ĐỂ CDK CÓ THỂ DELETE HẠ TẦNG SẠCH SẼ:
      // - RemovalPolicy.DESTROY: Khi bạn chạy `cdk destroy`, bucket này sẽ bị xóa khỏi AWS
      // - autoDeleteObjects: true: CDK sẽ tự động xóa sạch các file bên trong bucket trước khi xóa bucket
      // (Lưu ý: Chỉ dùng autoDeleteObjects cho môi trường Dev/Staging, Production nên cân nhắc giữ lại dữ liệu)
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,

      // Cấu hình CORS để phục vụ Client upload hoặc Backend gọi tệp tin nếu cần
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"], // Môi trường Production nên giới hạn domain cụ thể của Backend/Web
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
    });

    // =========================================================================
    // 2. AMAZON COGNITO (GOOGLE FEDERATED AUTH)
    // =========================================================================
    const googleClientId =
      (this.node.tryGetContext("googleClientId") as string | undefined) ??
      process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret =
      (this.node.tryGetContext("googleClientSecret") as string | undefined) ??
      process.env.GOOGLE_CLIENT_SECRET;

    if (!googleClientId || !googleClientSecret) {
      throw new Error(
        "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set (env or CDK context) to provision Cognito Google IdP.",
      );
    }

    const cognitoDomainPrefix =
      (this.node.tryGetContext("cognitoDomainPrefix") as string | undefined) ??
      process.env.COGNITO_DOMAIN_PREFIX ??
      `apms-${cdk.Aws.ACCOUNT_ID}`.slice(0, 63).toLowerCase();

    const oauthCallbackUrls =
      (this.node.tryGetContext("oauthCallbackUrls") as string[] | undefined) ??
      parseEnvList(process.env.OAUTH_CALLBACK_URLS) ?? [
        "http://localhost:3000/auth/callback",
        "apms://auth/callback",
      ];

    const oauthLogoutUrls =
      (this.node.tryGetContext("oauthLogoutUrls") as string[] | undefined) ??
      parseEnvList(process.env.OAUTH_LOGOUT_URLS) ?? [
        "http://localhost:3000/login",
        "apms://",
      ];

    const userPool = new cognito.UserPool(this, "APMSUserPool", {
      userPoolName: "apms-user-pool",
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
        profilePicture: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      "APMSGoogleProvider",
      {
        clientId: googleClientId,
        clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
        userPool,
        scopes: ["openid", "email", "profile"],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      },
    );

    const userPoolClient = new cognito.UserPoolClient(this, "APMSUserPoolClient", {
      userPool,
      userPoolClientName: "apms-web-mobile-client",
      generateSecret: false,
      authFlows: {
        userPassword: false,
        userSrp: false,
        custom: false,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: oauthCallbackUrls,
        logoutUrls: oauthLogoutUrls,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      preventUserExistenceErrors: true,
    });

    userPoolClient.node.addDependency(googleProvider);

    const userPoolDomain = userPool.addDomain("APMSUserPoolDomain", {
      cognitoDomain: { domainPrefix: cognitoDomainPrefix },
    });

    const adminGroup = new cognito.CfnUserPoolGroup(this, "APMSAdminGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "admin",
      description: "APMS administrators with access to /api/admin endpoints",
      precedence: 1,
    });

    const hostedUiBaseUrl = `https://${userPoolDomain.domainName}.auth.${cdk.Aws.REGION}.amazoncognito.com`;

    // =========================================================================
    // 3. TẠO IAM USER VÀ CẤP QUYỀN TRUY CẬP (PRINCIPLE OF LEAST PRIVILEGE)
    // =========================================================================
    const apiBackendUser = new iam.User(this, "APMSBackendUser", {
      userName: "apms-backend-service-user",
    });

    // Thêm các chính sách (Policies) cụ thể cho IAM User này

    // Quyền hạn đối với S3 Bucket vừa tạo ở trên
    apiBackendUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ],
        resources: [documentBucket.bucketArn, `${documentBucket.bucketArn}/*`],
      }),
    );

    // Quyền hạn gọi dịch vụ Amazon Textract để OCR trích xuất text từ văn bản
    // NOTE: Textract hiện không được dùng — extraction dùng pdf-parse + mammoth (local, không tốn chi phí)
    // Giữ lại permission để dễ enable về sau nếu cần OCR tài liệu scan
    apiBackendUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "textract:DetectDocumentText",
          "textract:StartDocumentAnalysis",
          "textract:GetDocumentAnalysis",
        ],
        resources: ["*"],
      }),
    );

    // Quyền gọi Amazon Bedrock — embedding (Cohere) + chat (Nova Micro)
    const bedrockEmbeddingModelId =
      process.env.BEDROCK_EMBEDDING_MODEL_ID ?? "cohere.embed-english-v3";
    const bedrockChatModelId =
      process.env.BEDROCK_MODEL_ID ?? "apac.amazon.nova-micro-v1:0";

    apiBackendUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/${bedrockEmbeddingModelId}`,
        ],
      }),
    );

    apiBackendUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:Converse"],
        resources: [
          `arn:aws:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-profile/${bedrockChatModelId}`,
          `arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/amazon.nova-micro-v1:0`,
        ],
      }),
    );

    // =========================================================================
    // 4. MONITORING & BUDGETS (Bedrock cost + invocation alerts)
    // =========================================================================
    const alertEmail = process.env.ALERT_EMAIL;
    if (!alertEmail?.trim()) {
      throw new Error(
        "ALERT_EMAIL must be set in infrastructure/.env for budget/alarm notifications.",
      );
    }

    const alertTopic = new sns.Topic(this, "APMSAlertTopic", {
      displayName: "APMS Bedrock Alerts",
    });

    alertTopic.addSubscription(new subs.EmailSubscription(alertEmail.trim()));

    const budgetLimitUsd = Number(process.env.BEDROCK_BUDGET_LIMIT_USD ?? "20");

    new budgets.CfnBudget(this, "APMSBedrockBudget", {
      budget: {
        budgetName: "apms-bedrock-monthly",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: budgetLimitUsd, unit: "USD" },
        costFilters: {
          Service: ["Amazon Bedrock"],
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            threshold: 80,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [{ subscriptionType: "SNS", address: alertTopic.topicArn }],
        },
        {
          notification: {
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            threshold: 100,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [{ subscriptionType: "SNS", address: alertTopic.topicArn }],
        },
        {
          notification: {
            notificationType: "FORECASTED",
            comparisonOperator: "GREATER_THAN",
            threshold: 100,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [{ subscriptionType: "SNS", address: alertTopic.topicArn }],
        },
      ],
    });

    const bedrockInvocationAlarm = (
      id: string,
      modelId: string,
      threshold: number,
    ): cloudwatch.Alarm => {
      const alarm = new cloudwatch.Alarm(this, id, {
        metric: new cloudwatch.Metric({
          namespace: "AWS/Bedrock",
          metricName: "Invocations",
          dimensionsMap: { ModelId: modelId },
          statistic: "Sum",
          period: cdk.Duration.days(1),
        }),
        threshold,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Bedrock daily invocations exceeded for ${modelId}`,
      });
      alarm.addAlarmAction(new cwActions.SnsAction(alertTopic));
      return alarm;
    };

    bedrockInvocationAlarm(
      "BedrockEmbedInvocationsAlarm",
      bedrockEmbeddingModelId,
      500,
    );
    bedrockInvocationAlarm("BedrockChatInvocationsAlarm", bedrockChatModelId, 200);

    // =========================================================================
    // 5. XUẤT THÔNG TIN ĐẦU RA (CLOUDFORMATION OUTPUTS)
    // =========================================================================
    new cdk.CfnOutput(this, "S3BucketNameOutput", {
      value: documentBucket.bucketName,
      description:
        "Name of the Amazon S3 Bucket to configure in api/.env (S3_BUCKET_NAME)",
    });

    new cdk.CfnOutput(this, "AWSRegionOutput", {
      value: cdk.Aws.REGION,
      description: "AWS Region to deploy (AWS_REGION)",
    });

    new cdk.CfnOutput(this, "IAMUserANameOutput", {
      value: apiBackendUser.userName,
      description: "IAM User to connect to the Backend API",
    });

    new cdk.CfnOutput(this, "CognitoUserPoolIdOutput", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID (COGNITO_USER_POOL_ID)",
    });

    new cdk.CfnOutput(this, "CognitoClientIdOutput", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito App Client ID (COGNITO_CLIENT_ID)",
    });

    new cdk.CfnOutput(this, "CognitoHostedUiDomainOutput", {
      value: `${userPoolDomain.domainName}.auth.${cdk.Aws.REGION}.amazoncognito.com`,
      description:
        "Cognito Hosted UI domain for Amplify oauth.domain (NEXT_PUBLIC_COGNITO_DOMAIN)",
    });

    new cdk.CfnOutput(this, "CognitoHostedUiUrlOutput", {
      value: hostedUiBaseUrl,
      description: "Cognito Hosted UI base URL",
    });

    new cdk.CfnOutput(this, "CognitoGoogleIdpRedirectUriOutput", {
      value: `${hostedUiBaseUrl}/oauth2/idpresponse`,
      description:
        "Add this URI as Authorized redirect URI in Google Cloud Console OAuth client",
    });

    new cdk.CfnOutput(this, "CognitoAdminGroupNameOutput", {
      value: adminGroup.groupName ?? "admin",
      description:
        "Cognito group for admins. In AWS Console: User Pool → Users → select user → Add user to group → admin. User must sign out and sign in again.",
    });

    new cdk.CfnOutput(this, "BedrockChatModelIdOutput", {
      value: bedrockChatModelId,
      description: "Bedrock chat model ID for api/.env (BEDROCK_MODEL_ID)",
    });

    new cdk.CfnOutput(this, "BedrockEmbeddingModelIdOutput", {
      value: bedrockEmbeddingModelId,
      description:
        "Bedrock embedding model ID for api/.env (BEDROCK_EMBEDDING_MODEL_ID)",
    });

    new cdk.CfnOutput(this, "AlertTopicArnOutput", {
      value: alertTopic.topicArn,
      description: "SNS topic ARN for Bedrock budget and CloudWatch alarms",
    });

    new cdk.CfnOutput(this, "BedrockBudgetNameOutput", {
      value: "apms-bedrock-monthly",
      description: "AWS Budget name for Bedrock monthly cost alerts",
    });
  }
}
