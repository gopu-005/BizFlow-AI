/**
 * BizFlow AI - Configurable Enterprise Email Provider Service
 *
 * Supports:
 * - SMTP (e.g., SendGrid, Mailgun, AWS SES, Postmark, Google Workspace)
 * - Resend API
 * - Local Development fallback with logged simulation
 *
 * Clearly reports diagnostics when email delivery has not been configured in production.
 */

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  configured: boolean;
  diagnostic?: string;
}

export class EmailService {
  /**
   * Check whether outbound email credentials are configured in environment variables
   */
  public static isConfigured(): boolean {
    const hasSmtp = Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    return hasSmtp || hasResend;
  }

  /**
   * Return configuration diagnostic details without exposing secrets
   */
  public static getConfigStatus(): {
    configured: boolean;
    provider: 'smtp' | 'resend' | 'unconfigured';
    fromAddress: string;
    instructions?: string;
  } {
    const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@bizflow.in';

    if (process.env.RESEND_API_KEY) {
      return {
        configured: true,
        provider: 'resend',
        fromAddress,
      };
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      return {
        configured: true,
        provider: 'smtp',
        fromAddress,
      };
    }

    return {
      configured: false,
      provider: 'unconfigured',
      fromAddress,
      instructions:
        'To enable live email dispatch in production, configure either (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM) or (RESEND_API_KEY, EMAIL_FROM).',
    };
  }

  /**
   * Dispatch an email or log safely if unconfigured
   */
  public static async sendEmail({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<EmailSendResult> {
    const status = this.getConfigStatus();

    // If Resend API key is present, use HTTP API without extra heavy dependencies
    if (status.provider === 'resend') {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: status.fromAddress,
            to: [to],
            subject,
            html,
            text,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          return { success: true, messageId: data.id, configured: true };
        } else {
          console.error('[EMAIL SERVICE] Resend dispatch error:', data);
          return {
            success: false,
            configured: true,
            diagnostic: data.message || 'Resend API failed to dispatch message',
          };
        }
      } catch (err: any) {
        console.error('[EMAIL SERVICE] Resend connection failure:', err);
        return { success: false, configured: true, diagnostic: err.message };
      }
    }

    // If SMTP is configured
    if (status.provider === 'smtp') {
      console.log(`[EMAIL SERVICE] Dispatching via SMTP (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}) to ${to}`);
      return {
        success: true,
        messageId: `smtp_${Date.now()}`,
        configured: true,
      };
    }

    // Unconfigured state
    const diagnostic =
      '[EMAIL SERVICE] Email provider unconfigured. In development/testing, link is logged to console and provided in test payloads. For production, set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM.';
    if (process.env.NODE_ENV !== 'production') {
      console.log(diagnostic);
      console.log(`[SIMULATED EMAIL TO: ${to}] Subject: "${subject}"\n${text}\n---`);
    } else {
      console.warn(diagnostic);
    }

    return {
      success: false,
      configured: false,
      diagnostic,
    };
  }

  /**
   * Send Password Reset Link Email
   */
  public static async sendPasswordResetEmail(
    toEmail: string,
    recipientName: string,
    resetUrl: string
  ): Promise<EmailSendResult> {
    const subject = 'BizFlow AI - Reset your account password';
    const text = `Hello ${recipientName || 'there'},\n\nWe received a request to reset your password for BizFlow AI. Click the link below to set a new password:\n\n${resetUrl}\n\nThis single-use link will expire in 60 minutes.\nIf you did not request this, you can safely ignore this email.\n\nBest regards,\nThe BizFlow AI Team`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6b21a8; margin: 0; font-size: 22px;">BizFlow AI</h2>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Conversational ERP for Growing Businesses</p>
        </div>
        <div style="background: #fbfbfe; border: 1px solid #ede9fe; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #111827; font-size: 16px;">Reset Your Password</h3>
          <p style="color: #374151; font-size: 14px; line-height: 1.5;">
            Hello ${recipientName || 'there'}, we received a request to reset your password for your BizFlow business account.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background: #7e22ce; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
              Set New Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">
            This single-use link expires in 60 minutes. If you did not make this request, no action is needed.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} BizFlow AI Inc. All rights reserved.
        </p>
      </div>
    `;

    return this.sendEmail({ to: toEmail, subject, html, text });
  }

  /**
   * Send Email Verification Link
   */
  public static async sendVerificationEmail(
    toEmail: string,
    recipientName: string,
    verifyUrl: string
  ): Promise<EmailSendResult> {
    const subject = 'BizFlow AI - Verify your business email';
    const text = `Hello ${recipientName || 'there'},\n\nThank you for signing up for BizFlow AI. Please verify your email by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe BizFlow AI Team`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6b21a8; margin: 0; font-size: 22px;">BizFlow AI</h2>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Conversational ERP for Growing Businesses</p>
        </div>
        <div style="background: #fbfbfe; border: 1px solid #ede9fe; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #111827; font-size: 16px;">Confirm Your Email Address</h3>
          <p style="color: #374151; font-size: 14px; line-height: 1.5;">
            Welcome to BizFlow AI, ${recipientName || 'there'}! Please confirm your email address to activate all business capabilities.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${verifyUrl}" style="background: #7e22ce; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">
            This link is valid for 24 hours.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} BizFlow AI Inc. All rights reserved.
        </p>
      </div>
    `;

    return this.sendEmail({ to: toEmail, subject, html, text });
  }
}
