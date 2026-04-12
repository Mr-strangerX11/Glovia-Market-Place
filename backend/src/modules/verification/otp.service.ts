import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * OTP Service abstraction
 * Supports multiple SMS gateways (Sparrow SMS, NTC, etc.)
 * Configure via environment variables
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly gateway = process.env.SMS_GATEWAY || 'mock'; // 'sparrow', 'ntc', 'mock'

  /**
   * Generate 6-digit OTP
   */
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP via configured SMS gateway
   */
  async sendOtp(phone: string, otp: string, purpose: string): Promise<boolean> {
    try {
      switch (this.gateway) {
        case 'sparrow':
          return await this.sendViaSparrow(phone, otp, purpose);
        case 'ntc':
          return await this.sendViaNTC(phone, otp, purpose);
        case 'mock':
        default:
          return this.sendViaMock(phone, otp, purpose);
      }
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${phone}:`, error);
      return false;
    }
  }

  /**
   * Sparrow SMS integration (Nepal)
   * https://sparrowsms.com/documentation.php
   */
  private async sendViaSparrow(phone: string, otp: string, purpose: string): Promise<boolean> {
    const token = process.env.SPARROW_SMS_TOKEN;
    const from = process.env.SPARROW_SMS_FROM || 'gloviaMarket';

    if (!token) {
      this.logger.warn('Sparrow SMS token not configured');
      return false;
    }

    const message = this.buildMessage(otp, purpose);

    // Sparrow SMS API call
    const response = await fetch('http://api.sparrowsms.com/v2/sms/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        from,
        to: phone,
        text: message,
      }),
    });

    const result = await response.json();
    this.logger.log(`Sparrow SMS response: ${JSON.stringify(result)}`);

    return result.response_code === 200;
  }

  /**
   * NTC SMS integration (Nepal Telecom)
   */
  private async sendViaNTC(phone: string, otp: string, purpose: string): Promise<boolean> {
    // Implement NTC SMS API integration
    this.logger.warn('NTC SMS gateway not implemented yet');
    return false;
  }

  /**
   * Mock SMS for development
   */
  private sendViaMock(phone: string, otp: string, purpose: string): boolean {
    const message = this.buildMessage(otp, purpose);
    this.logger.log(`[MOCK SMS] To: ${phone} | Message: ${message}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📱 SMS to ${phone}`);
    console.log(`📩 ${message}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return true;
  }

  /**
   * Build OTP message based on purpose
   */
  private buildMessage(otp: string, purpose: string): string {
    const templates = {
      phone_verification: `Your Glovia Market place verification code is: ${otp}. Valid for 5 minutes.`,
      login: `Your Glovia Market place login OTP is: ${otp}. Do not share with anyone.`,
      password_reset: `Your Glovia Market place password reset code is: ${otp}. Valid for 5 minutes.`,
    };

    return templates[purpose] || `Your Glovia Market place OTP is: ${otp}`;
  }
}

/**
 * Email OTP Service
 * Handles OTP delivery via email (SMTP, SendGrid, SES, or mock)
 */
@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);
  private readonly provider = (process.env.EMAIL_PROVIDER || '').toLowerCase(); // 'smtp', 'sendgrid', 'ses', 'mock'
  private readonly allowMockFallback = process.env.EMAIL_ALLOW_MOCK_FALLBACK === 'true';
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private transporter: Transporter | null = null;

  private readonly smtpHost = process.env.SMTP_HOST;
  private readonly smtpPort = parseInt(process.env.SMTP_PORT || '587');
  private readonly smtpSecure = process.env.SMTP_SECURE === 'true';
  private readonly smtpUser = process.env.SMTP_USER || process.env.SMTP_USERNAME;
  private readonly smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  private readonly smtpFromName = process.env.SMTP_FROM_NAME || 'Glovia Market place';
  private readonly smtpFromEmail = process.env.SMTP_FROM_EMAIL || this.smtpUser;
  private readonly sendgridApiKey = process.env.SENDGRID_API_KEY;
  private readonly sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL || this.smtpFromEmail || 'noreply@glovia.local';

  constructor() {
    // Initialize SMTP transporter if SMTP config exists
    if (this.hasSmtpConfig()) {
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        auth: {
          user: this.smtpUser,
          pass: this.smtpPassword,
        },
      });
    }
  }

  private hasSmtpConfig(): boolean {
    return !!(this.smtpHost && this.smtpUser && this.smtpPassword);
  }

  private getProviderSequence(): Array<'smtp' | 'sendgrid' | 'ses' | 'mock'> {
    const configured: Array<'smtp' | 'sendgrid' | 'ses' | 'mock'> = [];

    if (this.provider === 'smtp' || this.provider === 'sendgrid' || this.provider === 'ses' || this.provider === 'mock') {
      configured.push(this.provider as 'smtp' | 'sendgrid' | 'ses' | 'mock');
    }

    if (this.hasSmtpConfig() && !configured.includes('smtp')) configured.push('smtp');
    if (this.sendgridApiKey && !configured.includes('sendgrid')) configured.push('sendgrid');
    if (!configured.includes('ses') && this.provider === 'ses') configured.push('ses');

    if (configured.length === 0 || this.provider === 'mock' || this.allowMockFallback || !this.isProduction) {
      configured.push('mock');
    }

    return configured;
  }

  async getDeliveryHealth() {
    let smtpVerified: boolean | null = null;
    let smtpVerifyError: string | null = null;

    if (this.transporter) {
      try {
        const verifyPromise = this.transporter.verify();
        smtpVerified = await Promise.race<boolean>([
          verifyPromise,
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
        ]);

        if (!smtpVerified) {
          smtpVerifyError = 'SMTP verify timeout or failed';
        }
      } catch (error: any) {
        smtpVerified = false;
        smtpVerifyError = error?.message || 'SMTP verify failed';
      }
    }

    const providers = this.getProviderSequence();

    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      configuredProvider: this.provider || 'auto',
      providerSequence: providers,
      allowMockFallback: this.allowMockFallback,
      smtp: {
        configured: this.hasSmtpConfig(),
        hostConfigured: !!this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        usernameConfigured: !!this.smtpUser,
        passwordConfigured: !!this.smtpPassword,
        fromEmailConfigured: !!this.smtpFromEmail,
        verified: smtpVerified,
        verifyError: smtpVerifyError,
      },
      sendgrid: {
        configured: !!this.sendgridApiKey,
        fromEmailConfigured: !!this.sendgridFromEmail,
      },
      canAttemptRealDelivery: providers.some((provider) => provider === 'smtp' || provider === 'sendgrid' || provider === 'ses'),
    };
  }

  /**
   * Send OTP via email
   */
  async sendEmailOtp(email: string, otp: string, purpose: string): Promise<boolean> {
    const providers = this.getProviderSequence();

    for (const provider of providers) {
      try {
        switch (provider) {
          case 'smtp':
            if (await this.sendViaSMTP(email, otp, purpose)) {
              return true;
            }
            break;
          case 'sendgrid':
            if (await this.sendViaSendGrid(email, otp, purpose)) {
              return true;
            }
            break;
          case 'ses':
            if (await this.sendViaSES(email, otp, purpose)) {
              return true;
            }
            break;
          case 'mock':
            if (this.sendViaMock(email, otp, purpose)) {
              return true;
            }
            break;
          default:
            break;
        }
      } catch (error) {
        this.logger.error(`Email provider ${provider} failed for ${email}:`, error);
      }
    }

    this.logger.error(`Failed to send email OTP to ${email} via providers: ${providers.join(', ')}`);
    return false;
  }

  /**
   * SMTP email integration (Gmail, Outlook, etc.)
   */
  private async sendViaSMTP(email: string, otp: string, purpose: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP transporter not configured');
      return false;
    }

    const { subject, html } = this.buildEmailContent(otp, purpose);
    const fromEmail = this.smtpFromEmail;
    const fromName = this.smtpFromName;

    if (!fromEmail) {
      this.logger.warn('SMTP_FROM_EMAIL or SMTP_USER not configured');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject,
        html,
      });

      const acceptedCount = Array.isArray(info.accepted) ? info.accepted.length : 0;
      const rejectedCount = Array.isArray(info.rejected) ? info.rejected.length : 0;

      if (acceptedCount === 0 || rejectedCount > 0) {
        this.logger.error(`SMTP accepted=${acceptedCount}, rejected=${rejectedCount} for ${email}`);
        return false;
      }

      this.logger.log(`Email accepted by SMTP for ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`SMTP error sending to ${email}:`, error);
      return false;
    }
  }

  /**
   * SendGrid email integration
   */
  private async sendViaSendGrid(email: string, otp: string, purpose: string): Promise<boolean> {
    const apiKey = this.sendgridApiKey;
    if (!apiKey) {
      this.logger.warn('SendGrid API key not configured');
      return false;
    }

    const { subject, html } = this.buildEmailContent(otp, purpose);

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: this.sendgridFromEmail, name: this.smtpFromName },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });

      if (response.status !== 202) {
        const text = await response.text();
        this.logger.error(`SendGrid rejected email (${response.status}) for ${email}: ${text}`);
        return false;
      }

      this.logger.log(`Email accepted by SendGrid for ${email}`);
      return true;
    } catch (error) {
      this.logger.error('SendGrid error:', error);
      return false;
    }
  }

  /**
   * AWS SES email integration
   */
  private async sendViaSES(email: string, otp: string, purpose: string): Promise<boolean> {
    // TODO: Implement AWS SES integration
    this.logger.warn('AWS SES not implemented yet');
    return false;
  }

  /**
   * Mock email for development
   */
  private sendViaMock(email: string, otp: string, purpose: string): boolean {
    if (this.isProduction && !this.allowMockFallback) {
      this.logger.error('Mock email fallback is disabled in production');
      return false;
    }

    const { subject, html } = this.buildEmailContent(otp, purpose);
    this.logger.log(`[MOCK EMAIL] To: ${email} | Subject: ${subject}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✉️  EMAIL to ${email}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📄 Body:\n${html}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return true;
  }

  /**
   * Build email content based on purpose
   */
  private buildEmailContent(otp: string, purpose: string): { subject: string; html: string } {
    const templates: Record<string, { subject: string; html: string }> = {
      email_verification: {
        subject: 'Verify your Glovia Market place email address',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Email Verification</h2>
            <p>Welcome to Glovia Market place! To complete your registration, please verify your email.</p>
            <p style="font-size: 24px; font-weight: bold; color: #007bff;">${otp}</p>
            <p>Enter this code to verify your email. Valid for 5 minutes.</p>
            <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      },
      password_reset: {
        subject: 'Reset your Glovia Market place password',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Reset</h2>
            <p>Use this code to reset your password:</p>
            <p style="font-size: 24px; font-weight: bold; color: #007bff;">${otp}</p>
            <p>This code is valid for 5 minutes.</p>
            <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      },
    };

    return templates[purpose] || {
      subject: 'Glovia Market place Verification Code',
      html: `<p>Your verification code: <strong>${otp}</strong></p>`,
    };
  }
}
