import { IsString, IsOptional, IsNumber, IsDate, IsMongoId, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FlashDealProductDto {
  @IsMongoId()
  productId: string;

  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  productImage?: string;

  @IsNumber()
  originalPrice: number;

  @IsNumber()
  salePrice: number;

  @IsOptional()
  @IsNumber()
  discountPercentage?: number;
}

export class CreateFlashDealDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlashDealProductDto)
  products: FlashDealProductDto[];

  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @IsString()
  adImage: string; // Main ad/banner image URL

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class UpdateFlashDealDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlashDealProductDto)
  products?: FlashDealProductDto[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTime?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @IsOptional()
  @IsString()
  adImage?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
