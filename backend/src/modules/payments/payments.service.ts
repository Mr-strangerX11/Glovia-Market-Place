import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, Order, PaymentMethod, PaymentStatus, OrderStatus } from '../../database/schemas';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel('Payment') private paymentModel: Model<Payment>,
    @InjectModel('Order') private orderModel: Model<Order>,
    private configService: ConfigService,
  ) {}

  async initiateEsewaPayment(orderId: string) {
    const order = await this.orderModel
      .findById(orderId)
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentMethod !== PaymentMethod.ESEWA) {
      throw new BadRequestException('Invalid payment method for this order');
    }

    const esewaConfig = {
      amt: order.total.toString(),
      psc: '0',
      pdc: '0',
      txAmt: '0',
      tAmt: order.total.toString(),
      pid: order.orderNumber,
      scd: this.configService.get('ESEWA_MERCHANT_ID'),
      su: this.configService.get('ESEWA_SUCCESS_URL'),
      fu: this.configService.get('ESEWA_FAILURE_URL'),
    };

    return {
      paymentUrl: this.configService.get('ESEWA_GATEWAY_URL'),
      paymentData: esewaConfig,
    };
  }

  async verifyEsewaPayment(data: {
    oid: string;
    amt: string;
    refId: string;
  }) {
    const order = await this.orderModel
      .findOne({ orderNumber: data.oid })
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const verificationUrl = `${this.configService.get('ESEWA_GATEWAY_URL')}/epay/transrec`;
    
    try {
      const response = await axios.post(verificationUrl, {
        amt: data.amt,
        rid: data.refId,
        pid: data.oid,
        scd: this.configService.get('ESEWA_MERCHANT_ID'),
      });

      if (response.data.includes('Success')) {
        await this.paymentModel.findOneAndUpdate(
          { orderId: new Types.ObjectId(order._id) },
          {
            status: PaymentStatus.COMPLETED,
            transactionId: data.refId,
            paidAt: new Date(),
            gatewayResponse: data,
          },
          { new: true }
        );

        await this.orderModel.findByIdAndUpdate(order._id, {
          paymentStatus: PaymentStatus.COMPLETED,
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        });

        return { success: true, message: 'Payment verified successfully' };
      }

      throw new BadRequestException('Payment verification failed');
    } catch (error) {
      throw new BadRequestException('Payment verification failed');
    }
  }

  async initiateKhaltiPayment(orderId: string) {
    const order = await this.orderModel.findById(orderId).lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentMethod !== PaymentMethod.KHALTI) {
      throw new BadRequestException('Invalid payment method for this order');
    }

    const khaltiConfig = {
      publicKey: this.configService.get('KHALTI_PUBLIC_KEY'),
      amount: Number(order.total) * 100,
      productIdentity: order.orderNumber,
      productName: `Order #${order.orderNumber}`,
      productUrl: `${this.configService.get('FRONTEND_URL')}/orders/${order._id}`,
    };

    return khaltiConfig;
  }

  async verifyKhaltiPayment(data: {
    token: string;
    amount: number;
    orderId: string;
  }) {
    const order = await this.orderModel.findById(data.orderId).lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    try {
      const response = await axios.post(
        this.configService.get('KHALTI_GATEWAY_URL'),
        {
          token: data.token,
          amount: data.amount,
        },
        {
          headers: {
            Authorization: `Key ${this.configService.get('KHALTI_SECRET_KEY')}`,
          },
        },
      );

      if (response.data.state?.name === 'Completed') {
        await this.paymentModel.findOneAndUpdate(
          { orderId: new Types.ObjectId(order._id) },
          {
            status: PaymentStatus.COMPLETED,
            transactionId: response.data.idx,
            paidAt: new Date(),
            gatewayResponse: response.data,
          },
          { new: true }
        );

        await this.orderModel.findByIdAndUpdate(order._id, {
          paymentStatus: PaymentStatus.COMPLETED,
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        });

        return { success: true, message: 'Payment verified successfully' };
      }

      throw new BadRequestException('Payment verification failed');
    } catch (error) {
      throw new BadRequestException('Payment verification failed');
    }
  }

  async initiateIMEPayment(orderId: string) {
    const order = await this.orderModel.findById(orderId).lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentMethod !== PaymentMethod.IME_PAY) {
      throw new BadRequestException('Invalid payment method for this order');
    }

    const tokenId = this.generateIMEToken();
    const merchantCode = this.configService.get('IME_MERCHANT_CODE');
    const amount = order.total.toString();

    const requestData = {
      MerchantCode: merchantCode,
      Amount: amount,
      RefId: order.orderNumber,
      TokenId: tokenId,
    };

    return {
      paymentUrl: `${this.configService.get('IME_GATEWAY_URL')}/Checkout`,
      paymentData: requestData,
    };
  }

  async verifyIMEPayment(data: {
    TransactionId: string;
    RefId: string;
    Msisdn: string;
  }) {
    const order = await this.orderModel
      .findOne({ orderNumber: data.RefId })
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    try {
      const response = await axios.post(
        `${this.configService.get('IME_GATEWAY_URL')}/Validate`,
        {
          TransactionId: data.TransactionId,
          MerchantCode: this.configService.get('IME_MERCHANT_CODE'),
        },
      );

      if (response.data.ResponseCode === '0') {
        await this.paymentModel.findOneAndUpdate(
          { orderId: new Types.ObjectId(order._id) },
          {
            status: PaymentStatus.COMPLETED,
            transactionId: data.TransactionId,
            paidAt: new Date(),
            gatewayResponse: data,
          },
          { new: true }
        );

        await this.orderModel.findByIdAndUpdate(order._id, {
          paymentStatus: PaymentStatus.COMPLETED,
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        });

        return { success: true, message: 'Payment verified successfully' };
      }

      throw new BadRequestException('Payment verification failed');
    } catch (error) {
      throw new BadRequestException('Payment verification failed');
    }
  }

  private generateIMEToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
