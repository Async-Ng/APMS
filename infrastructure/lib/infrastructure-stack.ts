import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

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
    // 2. TẠO IAM USER VÀ CẤP QUYỀN TRUY CẬP (PRINCIPLE OF LEAST PRIVILEGE)
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
    apiBackendUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "textract:DetectDocumentText",
          "textract:StartDocumentAnalysis",
          "textract:GetDocumentAnalysis",
        ],
        // Textract là service không định danh cụ thể resource ARN khi gọi API xử lý nhanh
        resources: ["*"],
      }),
    );

    // Quyền hạn gọi Amazon Bedrock (Claude 3 Haiku và Titan Embeddings)
    apiBackendUser.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        // Giới hạn chỉ được gọi đúng 2 mô hình mà dự án APMS đăng ký sử dụng
        resources: [
          `arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
          `arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      }),
    );

    // =========================================================================
    // 3. XUẤT THÔNG TIN ĐẦU RA (CLOUDFORMATION OUTPUTS)
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
  }
}
