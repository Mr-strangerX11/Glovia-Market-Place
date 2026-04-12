import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class AddAddressWithGeoDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '+9779812345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Bagmati' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Kathmandu' })
  @IsString()
  district: string;

  @ApiProperty({ example: 'Kathmandu Metropolitan' })
  @IsString()
  municipality: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  wardNo: number;

  @ApiProperty({ example: 'Thamel' })
  @IsString()
  area: string;

  @ApiProperty({ required: false, example: 'Near Kathmandu Guest House' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty({ required: false, example: 27.7172 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ required: false, example: 85.324 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
