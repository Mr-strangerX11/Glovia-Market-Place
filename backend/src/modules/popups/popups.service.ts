import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Popup } from './popups.schema';

@Injectable()
export class PopupsService {
  constructor(
    @InjectModel('Popup') private popupModel: Model<Popup>
  ) {}

  async create(dto: any) {
    return this.popupModel.create(dto);
  }

  async findAll() {
    return this.popupModel.find().lean();
  }

  async findActive() {
    return this.popupModel.find({ isActive: true }).lean();
  }

  async update(id: string, dto: any) {
    return this.popupModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async remove(id: string) {
    return this.popupModel.findByIdAndDelete(id);
  }
}
