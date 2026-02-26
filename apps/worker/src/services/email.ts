import type { Env } from '../types';

// cloudflare:sockets is only available in Cloudflare Workers runtime.
// In Node.js/local mode, we fall back to nodemailer for SMTP.
let connect: typeof import('cloudflare:sockets').connect | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  connect = require('cloudflare:sockets').connect;
} catch {
  // Not in Cloudflare Workers — connect will be undefined
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using the best available method:
 * 1. SMTP via Cloudflare Workers TCP sockets (if running in Workers and SMTP_HOST is configured)
 * 2. SMTP via nodemailer (if running in Node.js/local mode and SMTP_HOST is configured)
 * 3. Resend API (if RESEND_API_KEY is configured)
 * 4. Console.log fallback (development)
 */
export async function sendEmail(env: Env, params: SendEmailParams): Promise<boolean> {
  if (env.SMTP_HOST) {
    // Detect Node.js/local runtime — use nodemailer instead of cloudflare:sockets
    const isLocalMode =
      typeof globalThis.process !== 'undefined' &&
      globalThis.process.env?.RUNTIME_MODE === 'local';

    if (isLocalMode || !connect) {
      return sendViaSMTPNodemailer(env, params);
    }

    return sendViaSMTP(env, params);
  }

  if (env.RESEND_API_KEY) {
    return sendViaResend(env, params);
  }

  // Development fallback
  console.log('=== EMAIL (dev mode) ===');
  console.log(`To: ${params.to}`);
  console.log(`Subject: ${params.subject}`);
  // Extract the verify URL from the HTML for easy copy-paste
  const urlMatch = params.html.match(/href="([^"]*verify[^"]*)"/);
  if (urlMatch) {
    console.log(`\n>>> Magic Link URL: ${urlMatch[1]}\n`);
  }
  console.log('========================');
  return true;
}

/**
 * Send email via SMTP using Cloudflare Workers TCP sockets.
 * Supports STARTTLS and AUTH LOGIN.
 */
async function sendViaSMTP(env: Env, params: SendEmailParams): Promise<boolean> {
  if (!connect) {
    console.error('SMTP: cloudflare:sockets is not available in this runtime');
    return false;
  }

  const host = env.SMTP_HOST!;
  const port = parseInt(env.SMTP_PORT || '587');
  const user = env.SMTP_USER || '';
  const pass = env.SMTP_PASS || '';
  const from = env.SMTP_FROM || `Hexi Gallery <noreply@${host}>`;

  try {
    const socket = connect({ hostname: host, port }, { secureTransport: port === 465 ? 'on' : 'starttls' });

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    async function readResponse(): Promise<string> {
      let response = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        response += decoder.decode(value, { stream: true });
        // SMTP responses end with \r\n and start with a 3-digit code
        // Multi-line responses have a dash after the code (e.g., "250-")
        // The last line has a space (e.g., "250 ")
        const lines = response.split('\r\n');
        const lastComplete = lines[lines.length - 2]; // last line before the trailing empty
        if (lastComplete && /^\d{3}\s/.test(lastComplete)) {
          break;
        }
        // If we have a single-line response
        if (response.includes('\r\n') && /^\d{3}\s/.test(response)) {
          break;
        }
      }
      return response;
    }

    async function sendCommand(cmd: string): Promise<string> {
      await writer.write(encoder.encode(cmd + '\r\n'));
      return readResponse();
    }

    // Read greeting
    await readResponse();

    // EHLO
    await sendCommand('EHLO hexi.gallery');

    // STARTTLS for port 587
    if (port === 587) {
      await sendCommand('STARTTLS');
      // Upgrade to TLS
      socket.startTls();
      // Re-EHLO after TLS
      await sendCommand('EHLO hexi.gallery');
    }

    // AUTH LOGIN
    if (user && pass) {
      await sendCommand('AUTH LOGIN');
      await sendCommand(btoa(user));
      const authResp = await sendCommand(btoa(pass));
      if (!authResp.startsWith('235')) {
        console.error('SMTP auth failed:', authResp);
        writer.close();
        return false;
      }
    }

    // MAIL FROM
    const fromEmail = from.match(/<(.+)>/)?.[1] || from;
    await sendCommand(`MAIL FROM:<${fromEmail}>`);

    // RCPT TO
    await sendCommand(`RCPT TO:<${params.to}>`);

    // DATA
    await sendCommand('DATA');

    // Build message with MIME headers for HTML
    const boundary = `hexi-${Date.now()}`;
    const message = [
      `From: ${from}`,
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${boundary}@hexi.gallery>`,
      '',
      btoa(params.html),
      '.',
    ].join('\r\n');

    const dataResp = await sendCommand(message);

    // QUIT
    await sendCommand('QUIT');
    writer.close();

    return dataResp.startsWith('250');
  } catch (error) {
    console.error('SMTP send error:', error);
    return false;
  }
}

/**
 * Send email via SMTP using nodemailer.
 * Used in Node.js/local mode where cloudflare:sockets is unavailable.
 */
async function sendViaSMTPNodemailer(env: Env, params: SendEmailParams): Promise<boolean> {
  try {
    const nodemailer = await import('nodemailer');
    const host = env.SMTP_HOST!;
    const port = parseInt(env.SMTP_PORT || '587');
    const from = env.SMTP_FROM || `Hexi Gallery <noreply@${host}>`;

    const transport = nodemailer.default.createTransport({
      host,
      port,
      secure: env.SMTP_PORT === '465',
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
    });

    await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    return true;
  } catch (error) {
    console.error('SMTP (nodemailer) send error:', error);
    return false;
  }
}

/**
 * Send email via Resend HTTP API
 */
async function sendViaResend(env: Env, params: SendEmailParams): Promise<boolean> {
  try {
    const from = env.SMTP_FROM || 'Hexi Gallery <noreply@hexi.gallery>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend send failed:', response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Resend send error:', error);
    return false;
  }
}

/**
 * Build magic link email HTML
 */
export function buildMagicLinkEmail(verifyUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
      <h1 style="font-size: 24px; margin-bottom: 24px;">Sign in to Hexi Gallery</h1>
      <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a;">Click the button below to sign in. This link expires in 15 minutes.</p>
      <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500; margin: 24px 0;">Sign In</a>
      <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">If you didn't request this email, you can safely ignore it.</p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">Or copy this link: ${verifyUrl}</p>
    </body>
    </html>
  `;
}
