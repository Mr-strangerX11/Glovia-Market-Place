import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface OrderEmailAddress {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  municipality: string;
  wardNo: number;
  area: string;
  landmark?: string;
}

interface OrderEmailPayload {
  orderNumber: string;
  total: number;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  items: OrderEmailItem[];
  address: OrderEmailAddress;
}

interface OrderStatusEmailPayload {
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  trackingNumber?: string;
  deliveryPartner?: string;
  updatedAt?: Date;
}

interface VendorOrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface VendorOrderEmailPayload {
  orderNumber: string;
  vendorName: string;
  vendorEmail: string;
  customerName: string;
  customerPhone: string;
  items: VendorOrderItem[];
  subtotal: number;
  deliveryAddress: OrderEmailAddress;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private readonly provider = process.env.EMAIL_PROVIDER || 'mock';
  private transporter: Transporter | null = null;

  constructor() {
    if (this.provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
  }

  async sendOrderConfirmedEmail(payload: OrderEmailPayload, adminEmail?: string): Promise<void> {
    const subject = `Order Confirmed - ${payload.orderNumber}`;
    const html = this.buildOrderConfirmedHtml(payload);

    const fromName = process.env.SMTP_FROM_NAME || 'Glovia Market place';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@glovia.local';

    const recipients = [payload.customerEmail, adminEmail].filter(Boolean).join(',');

    if (!recipients) {
      this.logger.warn('No recipients configured for order confirmation email');
      return;
    }

    if (this.provider === 'mock') {
      this.logger.log(`[MOCK EMAIL] To: ${recipients} | Subject: ${subject}`);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✉️  EMAIL to ${recipients}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📄 Body:\n${html}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    if (!this.transporter) {
      this.logger.warn('SMTP transporter not configured');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipients,
        subject,
        html,
      });
      this.logger.log(`Order confirmation email sent to ${recipients}`);
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation email.\nRecipients: ${recipients}\nSubject: ${subject}\nPayload: ${JSON.stringify(payload, null, 2)}`,
        error as Error
      );
      // Optionally, rethrow to let upstream handle notification failures
      throw error;
    }
  }

  async sendOrderStatusChangedEmail(payload: OrderStatusEmailPayload): Promise<void> {
    const subject = `Order Update - ${payload.orderNumber} is ${payload.status}`;
    const html = this.buildOrderStatusChangedHtml(payload);

    const fromName = process.env.SMTP_FROM_NAME || 'Glovia Market place';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@glovia.local';
    const recipients = payload.customerEmail;

    if (!recipients) {
      this.logger.warn('No customer recipient configured for order status email');
      return;
    }

    if (this.provider === 'mock') {
      this.logger.log(`[MOCK EMAIL] To: ${recipients} | Subject: ${subject}`);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✉️  EMAIL to ${recipients}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📄 Body:\n${html}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    if (!this.transporter) {
      this.logger.warn('SMTP transporter not configured');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipients,
        subject,
        html,
      });
      this.logger.log(`Order status email sent to ${recipients}`);
    } catch (error) {
      this.logger.error(
        `Failed to send order status email.\nRecipients: ${recipients}\nSubject: ${subject}\nPayload: ${JSON.stringify(payload, null, 2)}`,
        error as Error,
      );
      throw error;
    }
  }

  private buildOrderConfirmedHtml(payload: OrderEmailPayload): string {
    const itemsHtml = payload.items
      .map(
        (item) => `
          <tr>
            <td style="padding: 12px 8px; border-bottom: 1px solid #f1f1f1;">${item.name}</td>
            <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #f1f1f1;">${item.quantity}</td>
            <td style="padding: 12px 8px; text-align: right; border-bottom: 1px solid #f1f1f1;">NPR ${item.price}</td>
            <td style="padding: 12px 8px; text-align: right; border-bottom: 1px solid #f1f1f1;">NPR ${item.total}</td>
          </tr>
        `,
      )
      .join('');

    // Responsive and branded email template
    return `
      <div style="background: #f4f6fb; padding: 0; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-family: Arial, sans-serif;">
          <tr>
            <td style="background: #1e293b; padding: 24px 0; text-align: center;">
              <img src="https://glovia.com.np/logo.png" alt="Glovia Market place" style="height: 40px; margin-bottom: 8px;" />
              <h1 style="color: #fff; font-size: 24px; margin: 0; letter-spacing: 1px;">Glovia Market place</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px 16px 24px; color: #111;">
              <h2 style="margin-bottom: 8px; color: #16a34a; font-size: 22px;">Order Confirmed 🎉</h2>
              <p style="font-size: 16px; margin: 0 0 16px 0;">Hi <b>${payload.customerName}</b>, your order has been confirmed.</p>

              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 4px 0;"><strong>Order Number:</strong> ${payload.orderNumber}</p>
                <p style="margin: 0 0 4px 0;"><strong>Payment Method:</strong> ${payload.paymentMethod}</p>
              </div>

              <h3 style="margin: 24px 0 8px 0; font-size: 18px;">Order Items</h3>
              <table width="100%" style="border-collapse: collapse; background: #fff;">
                <thead>
                  <tr style="background: #f1f5f9; text-align: left;">
                    <th style="padding: 12px 8px;">Product</th>
                    <th style="padding: 12px 8px; text-align: center;">Qty</th>
                    <th style="padding: 12px 8px; text-align: right;">Price</th>
                    <th style="padding: 12px 8px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="margin-top: 24px; font-size: 16px;">
                <p><strong>Subtotal:</strong> NPR ${payload.subtotal}</p>
                <p><strong>Discount:</strong> NPR ${payload.discount}</p>
                <p><strong>Delivery Charge:</strong> NPR ${payload.deliveryCharge}</p>
                <p style="font-size: 20px; color: #16a34a;"><strong>Total:</strong> NPR ${payload.total}</p>
              </div>

              <h3 style="margin-top: 32px; font-size: 18px;">Delivery Address</h3>
              <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px;">
                <p style="margin: 0 0 4px 0;"><strong>${payload.address.fullName}</strong></p>
                <p style="margin: 0 0 4px 0;">${payload.address.phone}</p>
                <p style="margin: 0 0 4px 0;">${payload.address.area}, Ward ${payload.address.wardNo}, ${payload.address.municipality}</p>
                <p style="margin: 0 0 4px 0;">${payload.address.district}, ${payload.address.province}</p>
                ${payload.address.landmark ? `<p style=\"margin: 0 0 4px 0;\">Landmark: ${payload.address.landmark}</p>` : ''}
              </div>

              <p style="margin-top: 32px; font-size: 16px; color: #64748b;">Thank you for shopping with <b>Glovia Market place</b>!<br/>If you have any questions, reply to this email or contact our support.</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f1f5f9; text-align: center; padding: 16px; color: #64748b; font-size: 13px;">
              &copy; ${new Date().getFullYear()} Glovia Market place. All rights reserved.
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  private buildOrderStatusChangedHtml(payload: OrderStatusEmailPayload): string {
    const statusMessages: Record<string, string> = {
      PENDING: 'We have received your order and will process it shortly.',
      CONFIRMED: 'Your order has been confirmed and is now being prepared.',
      PROCESSING: 'Your order is currently being prepared for shipment.',
      SHIPPED: 'Great news! Your order is on the way.',
      DELIVERED: 'Your order has been delivered. Enjoy your purchase!',
      CANCELLED: 'Your order has been cancelled. If this was unexpected, please contact support.',
      RETURNED: 'Your order has been marked as returned.',
    };

    const statusMessage = statusMessages[payload.status] || 'Your order status has been updated.';
    const updatedAtText = payload.updatedAt ? new Date(payload.updatedAt).toLocaleString() : new Date().toLocaleString();

    return `
      <div style="background: #f4f6fb; padding: 0; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-family: Arial, sans-serif;">
          <tr>
            <td style="background: #1e293b; padding: 24px 0; text-align: center;">
              <h1 style="color: #fff; font-size: 24px; margin: 0; letter-spacing: 1px;">Glovia Market place</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px 16px 24px; color: #111;">
              <h2 style="margin-bottom: 8px; color: #2563eb; font-size: 22px;">Order Status Updated</h2>
              <p style="font-size: 16px; margin: 0 0 16px 0;">Hi <b>${payload.customerName || 'Customer'}</b>,</p>
              <p style="font-size: 15px; margin: 0 0 18px 0;">${statusMessage}</p>

              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 6px 0;"><strong>Order Number:</strong> ${payload.orderNumber}</p>
                <p style="margin: 0 0 6px 0;"><strong>Current Status:</strong> ${payload.status}</p>
                <p style="margin: 0 0 6px 0;"><strong>Updated At:</strong> ${updatedAtText}</p>
                <p style="margin: 0 0 6px 0;"><strong>Tracking Number:</strong> ${payload.trackingNumber || 'Not assigned yet'}</p>
                <p style="margin: 0;"><strong>Delivery Partner:</strong> ${payload.deliveryPartner || 'Pending assignment'}</p>
              </div>

              <p style="margin-top: 24px; font-size: 15px; color: #64748b;">Need help? Reply to this email or contact our support team.</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f1f5f9; text-align: center; padding: 16px; color: #64748b; font-size: 13px;">
              &copy; ${new Date().getFullYear()} Glovia Market place. All rights reserved.
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  async sendVendorOrderEmailAsync(payload: VendorOrderEmailPayload): Promise<void> {
    const subject = `New Order - ${payload.orderNumber}`;
    const html = this.buildVendorOrderHtml(payload);

    const fromName = process.env.SMTP_FROM_NAME || 'Glovia Market place';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@glovia.local';
    const recipients = payload.vendorEmail;

    if (!recipients) {
      this.logger.warn('No vendor recipient configured for vendor order email');
      return;
    }

    if (this.provider === 'mock') {
      this.logger.log(`[MOCK EMAIL] To: ${recipients} | Subject: ${subject}`);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✉️  VENDOR EMAIL to ${recipients}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📄 Body:\n${html}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    if (!this.transporter) {
      this.logger.warn('SMTP transporter not configured');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipients,
        subject,
        html,
      });
      this.logger.log(`Vendor order email sent to ${recipients}`);
    } catch (error) {
      this.logger.error(
        `Failed to send vendor order email.\nRecipients: ${recipients}\nSubject: ${subject}\nPayload: ${JSON.stringify(payload, null, 2)}`,
        error as Error,
      );
      throw error;
    }
  }

  private buildVendorOrderHtml(payload: VendorOrderEmailPayload): string {
    const itemsHtml = payload.items
      .map(
        (item) => `
          <tr>
            <td style="padding: 12px 8px; border-bottom: 1px solid #f1f1f1;">${item.name}</td>
            <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #f1f1f1;">${item.quantity}</td>
            <td style="padding: 12px 8px; text-align: right; border-bottom: 1px solid #f1f1f1;">NPR ${item.price}</td>
            <td style="padding: 12px 8px; text-align: right; border-bottom: 1px solid #f1f1f1;">NPR ${item.total}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <div style="background: #f4f6fb; padding: 0; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-family: Arial, sans-serif;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 0; text-align: center;">
              <h1 style="color: #fff; font-size: 24px; margin: 0; letter-spacing: 1px;">Glovia Market place</h1>
              <p style="color: #fff; margin: 4px 0 0 0; font-size: 14px;">Vendor Hub</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px 16px 24px; color: #111;">
              <h2 style="margin-bottom: 8px; color: #2563eb; font-size: 22px;">📦 New Order Received</h2>
              <p style="font-size: 16px; margin: 0 0 16px 0;">Hi <b>${payload.vendorName}</b>, you have a new order!</p>

              <div style="background: #f0f7ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2563eb;">
                <p style="margin: 0 0 4px 0;"><strong>Order Number:</strong> ${payload.orderNumber}</p>
                <p style="margin: 0 0 4px 0;"><strong>Customer:</strong> ${payload.customerName}</p>
                <p style="margin: 0;"><strong>Contact:</strong> ${payload.customerPhone}</p>
              </div>

              <h3 style="margin: 24px 0 8px 0; font-size: 18px;">Your Products in this Order</h3>
              <table width="100%" style="border-collapse: collapse; background: #fff;">
                <thead>
                  <tr style="background: #f1f5f9; text-align: left;">
                    <th style="padding: 12px 8px;">Product</th>
                    <th style="padding: 12px 8px; text-align: center;">Qty</th>
                    <th style="padding: 12px 8px; text-align: right;">Price</th>
                    <th style="padding: 12px 8px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="margin-top: 24px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                <p style="margin: 0; text-align: right;"><strong>Subtotal from your items:</strong> NPR ${payload.subtotal}</p>
              </div>

              <h3 style="margin-top: 32px; font-size: 18px;">Delivery Address</h3>
              <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px;">
                <p style="margin: 0 0 4px 0;"><strong>${payload.deliveryAddress.fullName}</strong></p>
                <p style="margin: 0 0 4px 0;">${payload.deliveryAddress.phone}</p>
                <p style="margin: 0 0 4px 0;">${payload.deliveryAddress.area}, Ward ${payload.deliveryAddress.wardNo}, ${payload.deliveryAddress.municipality}</p>
                <p style="margin: 0 0 4px 0;">${payload.deliveryAddress.district}, ${payload.deliveryAddress.province}</p>
                ${payload.deliveryAddress.landmark ? `<p style="margin: 0 0 4px 0;">Landmark: ${payload.deliveryAddress.landmark}</p>` : ''}
              </div>

              <div style="margin-top: 32px; background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #16a34a;">
                <p style="margin: 0; font-size: 15px;"><strong>✅ Action Required:</strong> Please prepare and ship this order within 24 hours. Keep the customer updated!</p>
              </div>

              <p style="margin-top: 24px; font-size: 15px; color: #64748b;">Thank you for being a valued vendor partner on <b>Glovia Market place</b>!<br/>Login to your vendor dashboard to manage this order.</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f1f5f9; text-align: center; padding: 16px; color: #64748b; font-size: 13px;">
              &copy; ${new Date().getFullYear()} Glovia Market place. All rights reserved.
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  async sendNewsletterSubscriptionEmail(customerEmail: string, customerName?: string): Promise<void> {
    const subject = '🎉 Welcome to Glovia Rewards! Your Exclusive Promo Code Inside';
    const html = this.buildNewsletterSubscriptionHtml(customerEmail, customerName);

    const fromName = process.env.SMTP_FROM_NAME || 'Glovia Market place';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@glovia.local';
    const recipients = customerEmail;

    if (!recipients) {
      this.logger.warn('No customer email configured for newsletter subscription');
      return;
    }

    if (this.provider === 'mock') {
      this.logger.log(`[MOCK EMAIL] Newsletter subscription to ${recipients}`);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✉️  NEWSLETTER EMAIL to ${recipients}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📄 Body:\n${html}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    if (!this.transporter) {
      this.logger.warn('SMTP transporter not configured');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipients,
        subject,
        html,
      });
      this.logger.log(`Newsletter subscription email sent to ${recipients}`);
    } catch (error) {
      this.logger.error(
        `Failed to send newsletter subscription email.\nRecipients: ${recipients}\nSubject: ${subject}`,
        error as Error,
      );
      throw error;
    }
  }

  private buildNewsletterSubscriptionHtml(email: string, name?: string): string {
    const displayName = name || email.split('@')[0];

    return `
      <div style="background: #f4f6fb; padding: 0; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-family: Arial, sans-serif;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 24px; text-align: center;">
              <h1 style="color: #fff; font-size: 28px; margin: 0 0 8px 0; letter-spacing: 0.5px;">🎉 Welcome!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">You're now part of Glovia Rewards</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="font-size: 16px; color: #1f2937; margin: 0 0 24px 0;">Hi <strong>${displayName}</strong>,</p>

              <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Thank you for subscribing to Glovia! We're thrilled to have you join our community of beauty & wellness enthusiasts. 
              </p>

              <!-- Promo Code Box -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
                <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Exclusive Welcome Offer</p>
                <p style="color: #fff; font-size: 14px; margin: 0 0 8px 0;">Use this code at checkout:</p>
                <div style="background: rgba(255,255,255,0.15); border: 2px dashed rgba(255,255,255,0.3); padding: 16px; border-radius: 8px; margin: 12px 0;">
                  <p style="color: #fff; font-size: 32px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">SUB-GLOVIA</p>
                </div>
                <p style="color: rgba(255,255,255,0.85); font-size: 13px; margin: 12px 0 0 0;">✨ Exclusive subscriber-only promo code</p>
              </div>

              <!-- Benefits -->
              <h3 style="font-size: 16px; color: #1f2937; margin: 28px 0 16px 0;">What You'll Get:</h3>
              <ul style="list-style: none; padding: 0; margin: 0 0 24px 0;">
                <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-size: 16px; margin-right: 10px;">💝</span>
                  <span style="color: #4b5563; font-size: 15px;">Exclusive deals & first-buyer offers</span>
                </li>
                <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-size: 16px; margin-right: 10px;">🎁</span>
                  <span style="color: #4b5563; font-size: 15px;">Loyalty point updates & referral bonuses</span>
                </li>
                <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-size: 16px; margin-right: 10px;">⚡</span>
                  <span style="color: #4b5563; font-size: 15px;">Flash sale alerts delivered straight to your inbox</span>
                </li>
                <li style="padding: 10px 0;">
                  <span style="font-size: 16px; margin-right: 10px;">✅</span>
                  <span style="color: #4b5563; font-size: 15px;">Early access to new product launches</span>
                </li>
              </ul>

              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://glovia.com.np/products" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 15px; transition: transform 0.2s;">
                  Start Shopping Now →
                </a>
              </div>

              <!-- Trust Message -->
              <div style="background: #f0f7ff; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <p style="color: #0c4a6e; font-size: 13px; margin: 0 0 8px 0;"><strong>📧 No Spam, Ever</strong></p>
                <p style="color: #64748b; font-size: 13px; margin: 0;">We send only curated deals, seasonal offers, and important updates. Unsubscribe anytime with one click.</p>
              </div>

              <p style="font-size: 14px; color: #64748b; margin: 24px 0 0 0;">
                Happy shopping,<br/>
                <strong style="color: #667eea;">The Glovia Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 12px 0;">
                &copy; ${new Date().getFullYear()} Glovia Market place. All rights reserved.
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                <a href="http://glovia.com.np/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a> • 
                <a href="http://glovia.com.np/terms" style="color: #667eea; text-decoration: none;">Terms & Conditions</a>
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;
  }
}
