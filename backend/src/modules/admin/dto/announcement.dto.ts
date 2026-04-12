import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateAnnouncementDto {
  @ApiProperty({ required: false, example: true, description: 'Whether announcement bar is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false, example: '🚚 Express Delivery: We deliver within 60 minutes!', description: 'Announcement message text' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiProperty({ required: false, example: '#0066CC', description: 'Background color in hex format' })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  backgroundColor?: string;

  @ApiProperty({ required: false, example: '#FFFFFF', description: 'Text color in hex format' })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  textColor?: string;
}
