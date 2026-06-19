import { SendEmailCommand } from "@aws-sdk/client-ses";

import { getEnv, getSesClient } from "../config/aws";

const BRAND_COLOR = "#F37021";

function resourceLabel(resourceType: "folder" | "document"): string {
  return resourceType === "folder" ? "thư mục" : "tài liệu";
}

function wrapEmailHtml(title: string, bodyHtml: string, ctaText: string, ctaLink: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1A1A1A;">
      <div style="font-size: 20px; font-weight: bold; color: ${BRAND_COLOR}; margin-bottom: 16px;">APMS</div>
      <h1 style="font-size: 18px; margin: 0 0 12px;">${title}</h1>
      <p style="font-size: 14px; line-height: 1.5;">${bodyHtml}</p>
      <a href="${ctaLink}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;">${ctaText}</a>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const env = getEnv();
  try {
    await getSesClient().send(
      new SendEmailCommand({
        Source: env.SES_FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: html, Charset: "UTF-8" } },
        },
      }),
    );
  } catch (error) {
    console.error(`[mailer] Failed to send email to ${to}:`, error);
  }
}

export async function sendShareNotificationEmail(params: {
  to: string;
  sharerName: string;
  resourceName: string;
  resourceType: "folder" | "document";
  link: string;
}): Promise<void> {
  const label = resourceLabel(params.resourceType);
  const subject = `${params.sharerName} đã chia sẻ ${label} "${params.resourceName}" với bạn`;
  const html = wrapEmailHtml(
    subject,
    `${params.sharerName} đã chia sẻ ${label} <strong>${params.resourceName}</strong> với bạn trên APMS.`,
    "Xem ngay",
    params.link,
  );

  await sendEmail(params.to, subject, html);
}

export async function sendShareInviteEmail(params: {
  to: string;
  sharerName: string;
  resourceName: string;
  resourceType: "folder" | "document";
  inviteLink: string;
}): Promise<void> {
  const label = resourceLabel(params.resourceType);
  const subject = `${params.sharerName} đã chia sẻ ${label} "${params.resourceName}" với bạn trên APMS`;
  const html = wrapEmailHtml(
    subject,
    `${params.sharerName} muốn chia sẻ ${label} <strong>${params.resourceName}</strong> với bạn. Đăng nhập bằng Google để xem ngay.`,
    "Đăng nhập để xem",
    params.inviteLink,
  );

  await sendEmail(params.to, subject, html);
}
