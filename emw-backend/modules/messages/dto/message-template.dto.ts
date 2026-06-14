import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  MinLength,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { PartialType } from '@nestjs/mapped-types';

export class MediaAttachmentDto {
  @ApiProperty({ description: 'Type of media (e.g., image, video, document)', example: 'image' })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Public URL of the media file',
    example: 'https://example.com/media.jpg',
  })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Optional caption for the media', required: false })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({ description: 'Optional filename for documents', required: false })
  @IsOptional()
  @IsString()
  filename?: string;
}

export class CreateMessageTemplateDto {
  @ApiProperty({
    description: 'Name of the template (e.g., "Saludo Inicial")',
    example: 'Saludo Inicial',
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    description: 'The message content, often including placeholders for variables.',
    example: 'Hola {{1}}, gracias por contactarnos.',
  })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Display order in the UI', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({
    description: 'Whether the template is active and ready to use',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    type: [MediaAttachmentDto],
    description: 'Optional media attachments for the template',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  mediaAttachments?: MediaAttachmentDto[];
}

export class UpdateMessageTemplateDto extends PartialType(CreateMessageTemplateDto) {}
