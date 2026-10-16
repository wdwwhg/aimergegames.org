import { render } from '@react-email/components';

import type { EmailMessage, EmailProvider, EmailSendResult } from '.';

export type CloudflareEmailBinding = {
  send(message: {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    headers?: Record<string, string>;
    attachments?: {
      content: string | Buffer;
      filename: string;
      type: string;
      disposition: 'attachment';
    }[];
  }): Promise<{ messageId: string }>;
};

const safeErrors: Record<string, string> = {
  E_SENDER_NOT_VERIFIED: 'Verify the email sender domain in Cloudflare first.',
  E_SENDER_DOMAIN_NOT_AVAILABLE:
    'Enable Email Sending for the sender domain in Cloudflare.',
  E_RECIPIENT_NOT_ALLOWED:
    'The email recipient is not allowed by the sending binding.',
  E_RECIPIENT_SUPPRESSED: 'The email recipient is suppressed by the provider.',
  E_RATE_LIMIT_EXCEEDED:
    'The email sending rate limit was reached. Try again later.',
  E_DAILY_LIMIT_EXCEEDED: 'The daily email sending limit was reached.',
};

export class CloudflareBindingEmailProvider implements EmailProvider {
  readonly name = 'cloudflare';
  constructor(
    public configs: {
      binding: CloudflareEmailBinding;
      defaultFrom: string;
      timeoutMs?: number;
    }
  ) {}

  async sendEmail(email: EmailMessage): Promise<EmailSendResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const from = email.from || this.configs.defaultFrom;
      if (!from || /[\r\n]/.test(from + email.subject)) throw new Error();
      const html = email.react ? await render(email.react) : email.html;
      // No retry: a timed-out provider call may still have accepted the message.
      const result = await Promise.race([
        this.configs.binding.send({
          from,
          to: email.to,
          subject: email.subject,
          ...(html ? { html } : {}),
          ...(email.text ? { text: email.text } : {}),
          ...(email.cc ? { cc: email.cc } : {}),
          ...(email.bcc ? { bcc: email.bcc } : {}),
          ...(email.replyTo ? { replyTo: email.replyTo } : {}),
          ...(email.headers ? { headers: email.headers } : {}),
          ...(email.attachments
            ? {
                attachments: email.attachments.map((a) => ({
                  content: a.content,
                  filename: a.filename,
                  type: a.contentType || 'application/octet-stream',
                  disposition: 'attachment' as const,
                })),
              }
            : {}),
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error()),
            this.configs.timeoutMs ?? 20000
          );
        }),
      ]);
      if (!result || typeof result.messageId !== 'string' || !result.messageId)
        throw new Error();
      return {
        success: true,
        messageId: result.messageId,
        provider: this.name,
      };
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : '';
      return {
        success: false,
        provider: this.name,
        error:
          safeErrors[code] ||
          'Email could not be sent. Check the email service and try again.',
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
