import { Resend } from "resend";

export async function sendMemorialEmail({
  toEmail,
  fullName,
  memorialUrl,
  qrPngUrl,
  mode = "memorial",
}: {
  toEmail: string;
  fullName: string;
  memorialUrl: string;
  qrPngUrl: string | null;
  mode?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping memorial email");
    return;
  }

  const resend = new Resend(apiKey);
  const isStory = mode === "story";
  const isAlbum = mode === "album";

  const qrCaption = isAlbum
    ? "Print it, stick it on the invitation, the frame, or anywhere the moment lives."
    : isStory
      ? "Share it with them or anyone who wants to know their story."
      : "Print on sticker paper or get it engraved.";

  const qrBlock = qrPngUrl
    ? `<div style="text-align:center;margin:32px 0;">
        <img src="${qrPngUrl}" alt="QR code for ${fullName}" width="200" height="200" style="border-radius:12px;" />
        <p style="margin-top:12px;font-size:12px;color:#888;font-style:italic;">${qrCaption}</p>
       </div>`
    : "";

  const headerSubtitle = isAlbum ? "Your album is ready." : isStory ? "Their story is ready." : "Their memorial is ready.";
  const bodyLine1 = isAlbum
    ? `The album for <strong>${fullName}</strong> has been written and is now live. Anyone with the link — or the QR code — can open it instantly.`
    : isStory
      ? `The story for <strong>${fullName}</strong> has been written and is now live. Anyone with the link can read it — and the QR code takes them straight there.`
      : `The memorial for <strong>${fullName}</strong> has been written and is now live. Their story is ready to be heard by anyone who scans the QR code.`;
  const bodyLine2 = isAlbum
    ? `Print the QR code and stick it on the invitation, the photo, the frame — anywhere the moment deserves to live a little longer.`
    : isStory
      ? `You can visit the page, share the link, or print the QR code below to place it on a frame, shelf, or anywhere their story should live.`
      : `You can visit the memorial, share the link, or print the QR code below to place it anywhere they are remembered.`;
  const ctaLabel = isAlbum ? "Open the album →" : isStory ? "View their story →" : "View memorial →";
  const subject = isAlbum
    ? `${fullName} — your album is ready · Forever Here`
    : isStory
      ? `${fullName}'s story is ready — Forever Here`
      : `${fullName}'s memorial is ready — Forever Here`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9f6f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e2d9;">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#c9a96e;">Forever Here</p>
            <h1 style="margin:8px 0 0;font-size:24px;color:#f9f6f0;font-weight:400;">${fullName}</h1>
            <p style="margin:8px 0 0;font-size:12px;color:rgba(249,246,240,0.5);font-style:italic;">${headerSubtitle}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 16px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#3a3a3a;">
              ${bodyLine1}
            </p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#3a3a3a;">
              ${bodyLine2}
            </p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${memorialUrl}" style="display:inline-block;background:#1a1a2e;color:#f9f6f0;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:14px;font-family:sans-serif;letter-spacing:0.05em;">
                ${ctaLabel}
              </a>
            </div>
          </td>
        </tr>

        <!-- QR -->
        <tr>
          <td style="padding:0 40px;">
            ${qrBlock}
          </td>
        </tr>

        <!-- Edit note -->
        <tr>
          <td style="padding:16px 40px 40px;">
            <p style="margin:0;font-size:13px;color:#888;line-height:1.6;border-top:1px solid #e8e2d9;padding-top:24px;">
              <strong style="color:#555;">The story not quite right?</strong> Visit the page and click <em>"Edit story"</em> — enter this email address to make changes anytime.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f6f0;padding:20px 40px;text-align:center;border-top:1px solid #e8e2d9;">
            <p style="margin:0;font-size:11px;color:#aaa;font-family:sans-serif;">
              Forever Here · <a href="https://www.qrheadstone.com" style="color:#aaa;">qrheadstone.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: "Forever Here <memories@qrheadstone.com>",
    to: toEmail,
    subject,
    html,
  });
}
