"use server";

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface ShareNotificationParams {
  to: string;
  assetName: string;
  assetUrl: string;
  sharerName: string;
}

export async function sendShareNotification({
  to,
  assetName,
  assetUrl,
  sharerName,
}: ShareNotificationParams) {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping share notification"
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: "AssetVault <onboarding@resend.dev>",
    to,
    subject: `You've been invited to view: ${assetName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
        <h2 style="margin: 0 0 16px;">You've been invited to view an asset</h2>
        <p style="color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
          <strong>${sharerName}</strong> shared <strong>${assetName}</strong> with you on AssetVault.
        </p>
        <a href="${assetUrl}"
           style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          View Asset
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin: 32px 0 0; line-height: 1.5;">
          If you don't have an AssetVault account, you can still view and download this asset using the link above.
        </p>
      </div>
    `,
    text: `${sharerName} shared "${assetName}" with you on AssetVault.\n\nView it here: ${assetUrl}`,
  });

  if (error) {
    console.error("[email] Failed to send share notification:", error);
  }
}
