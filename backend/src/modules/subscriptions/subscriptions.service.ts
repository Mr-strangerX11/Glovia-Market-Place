import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewsletterSubscriber } from '../../database/schemas/newsletter.schema';
import { EmailNotificationService } from '../../common/services/email-notification.service';
import * as XLSX from 'xlsx';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel('NewsletterSubscriber')
    private readonly subscriberModel: Model<NewsletterSubscriber>,
    private readonly emailService: EmailNotificationService,
  ) {}

  async subscribe(email: string, source?: string): Promise<{ message: string; alreadySubscribed: boolean; promoCode?: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new BadRequestException('Invalid email address');
    }

    const existing = await this.subscriberModel.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.isActive) {
        return { message: 'You are already subscribed!', alreadySubscribed: true };
      }
      // Re-activate if previously unsubscribed
      existing.isActive = true;
      await existing.save();
      // Send email on re-subscription
      await this.emailService.sendNewsletterSubscriptionEmail(normalizedEmail);
      return { message: 'Welcome back! You have been re-subscribed.', alreadySubscribed: false, promoCode: 'SUB-GLOVIA' };
    }

    // Create new subscription
    await this.subscriberModel.create({ email: normalizedEmail, source: source || 'homepage' });
    
    // Send welcome email with promo code
    try {
      await this.emailService.sendNewsletterSubscriptionEmail(normalizedEmail);
    } catch (error) {
      console.error('Failed to send newsletter subscription email:', error);
      // Don't fail subscription if email fails
    }

    return { message: 'Successfully subscribed! Thank you for joining Glovia.', alreadySubscribed: false, promoCode: 'SUB-GLOVIA' };
  }

  async unsubscribe(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    await this.subscriberModel.findOneAndUpdate(
      { email: normalizedEmail },
      { isActive: false },
    );
    return { message: 'You have been unsubscribed.' };
  }

  async getAllSubscribers(limit?: number, skip?: number) {
    const query = this.subscriberModel.find({ isActive: true }).sort({ createdAt: -1 });
    
    if (skip) query.skip(skip);
    if (limit) query.limit(limit);
    
    return query.lean();
  }

  async getSubscriberCount() {
    return this.subscriberModel.countDocuments({ isActive: true });
  }

  async exportSubscribersToExcel(): Promise<Buffer> {
    // Get all active subscribers
    const subscribers = await this.subscriberModel.find({ isActive: true }).sort({ createdAt: -1 }).lean();

    // Prepare data for Excel
    const data = subscribers.map((sub, index) => ({
      '#': index + 1,
      'Email': sub.email,
      'Source': sub.source || 'homepage',
      'Subscribed Date': new Date(sub.createdAt).toLocaleDateString('en-US'),
      'Subscribed Time': new Date(sub.createdAt).toLocaleTimeString('en-US'),
      'Status': sub.isActive ? 'Active' : 'Inactive',
    }));

    // Add summary at the top
    const summary = [
      { '#': 'GLOVIA NEWSLETTER SUBSCRIBERS REPORT', 'Email': '', 'Source': '', 'Subscribed Date': '', 'Subscribed Time': '', 'Status': '' },
      { '#': `Generated on: ${new Date().toLocaleString()}`, 'Email': '', 'Source': '', 'Subscribed Date': '', 'Subscribed Time': '', 'Status': '' },
      { '#': `Total Subscribers: ${subscribers.length}`, 'Email': '', 'Source': '', 'Subscribed Date': '', 'Subscribed Time': '', 'Status': '' },
      { '#': '', 'Email': '', 'Source': '', 'Subscribed Date': '', 'Subscribed Time': '', 'Status': '' },
      ...data,
    ];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(summary);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subscribers');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },  // Index
      { wch: 30 }, // Email
      { wch: 15 }, // Source
      { wch: 15 }, // Date
      { wch: 15 }, // Time
      { wch: 12 }, // Status
    ];

    // Convert to buffer
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  }
}
