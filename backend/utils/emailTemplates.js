/**
 * Utility for generating responsive, beautifully styled HTML email templates
 * compatible with all major email clients (Gmail, Outlook, Apple Mail).
 */

export const generateOTPTemplate = ({
  recipientName = "User",
  otpCode = "000000",
  title = "Login Verification Code",
  subtitle = "Use the One-Time Password (OTP) below to authenticate your session.",
  expireMinutes = 5
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center;">
              <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 1px; display: inline-block;">
                AISS AES <span style="color: #38bdf8; font-weight: 400;">| Evaluation Platform</span>
              </div>
              <div style="font-size: 13px; color: #94a3b8; margin-top: 6px; font-weight: 500;">
                Automated Examination & Scoring System
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                Hello ${recipientName},
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                ${subtitle}
              </p>

              <!-- Clean Centered Monospace OTP Box with Select-All -->
              <div style="background-color: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 24px 20px; text-align: center; margin: 28px 0;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #64748b; margin-bottom: 12px;">
                  One-Time Password
                </div>

                <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #0284c7; padding: 14px 24px; background-color: #ffffff; border: 1.5px solid #bae6fd; border-radius: 10px; display: inline-block; user-select: all; -webkit-user-select: all; -moz-user-select: all; cursor: pointer; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.05);" title="Tap or click to select code">
                  ${otpCode}
                </div>

                <div style="font-size: 12px; color: #64748b; margin-top: 14px; font-weight: 500;">
                  Valid for <strong>${expireMinutes} minutes</strong> &bull; Do not share this code
                </div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin-top: 24px;">
                <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                  <strong>Security Note:</strong> If you did not request this OTP code, please change your account password immediately or notify system administration.
                </p>
              </div>

              <p style="margin: 32px 0 0 0; font-size: 14px; color: #64748b;">
                Best regards,<br>
                <strong style="color: #0f172a;">The AISS Platform Security Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                This is an automated system notification. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

export const generateRegistrationDetailsTemplate = ({
  recipientName = "Administrator",
  title = "New Registration Request",
  subtitle = "A new user registration has been submitted and requires your review.",
  badgeText = "Awaiting Action",
  badgeColor = "#f59e0b",
  details = [],
  deepLinkPath = "/dashboard",
  actionUrl = null,
  actionText = "Review Request in Dashboard",
  footerNote = "Please log in to your administrative dashboard to approve or reject this request."
}) => {
  // Construct deep link URL: aiss-aes:// custom scheme with HTTPS web fallback
  const webBase = process.env.FRONTEND_URL || "http://localhost:5173";
  const finalActionUrl = actionUrl || `${webBase}${deepLinkPath.startsWith('/') ? deepLinkPath : '/' + deepLinkPath}`;
  const deepLinkAppUrl = `aiss-aes://${deepLinkPath.replace(/^\//, '')}`;

  const detailRows = details.map(item => `
    <tr>
      <td width="35%" style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        ${item.label}
      </td>
      <td width="65%" style="padding: 10px 14px; font-size: 14px; color: #0f172a; font-weight: 500; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
        ${item.value || 'N/A'}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center;">
              <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">
                AISS AES <span style="color: #38bdf8; font-weight: 400;">| Admin Portal</span>
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="display: inline-block; background-color: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}40; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                ${badgeText}
              </div>

              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                Dear ${recipientName},
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                ${subtitle}
              </p>

              <!-- Details Card Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: separate; border-spacing: 0; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                ${detailRows}
              </table>

              <!-- Action Link / Button (Primary Deep-Link / Web Fallback) -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${deepLinkAppUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25); letter-spacing: 0.3px;">
                  ${actionText} &rarr;
                </a>
                <div style="margin-top: 10px; font-size: 12px; color: #64748b;">
                  Opening on web browser? <a href="${finalActionUrl}" style="color: #0284c7; text-decoration: underline;">Click here</a>
                </div>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ${footerNote}
              </p>

              <p style="margin: 32px 0 0 0; font-size: 14px; color: #64748b;">
                Best regards,<br>
                <strong style="color: #0f172a;">AISS Administrative Hub</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Automated notification from AISS Examination System.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

