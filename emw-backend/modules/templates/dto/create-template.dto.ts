import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { TemplateCategory, TemplateLanguage } from "../entities/template.entity";

export enum TemplateParameters{
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  COMPANY_NAME = 'companyName',
  TITLE = 'title',
  LAST_CONTACT = 'lastContact',
  CAMPAING = 'campaing',
  NOTE = 'note',
  LABEL = 'label',
  DATA1 = 'data1',
  DATA2 = 'data2',
  DATA3 = 'data3',
}
export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @IsNotEmpty()
  @IsEnum(TemplateLanguage)
  language: TemplateLanguage;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  header?: {
    type: 'TEXT' | 'MEDIA';
    text?: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  };

  @IsOptional()
  footer?: {
    text: string;
  };

 @IsOptional()
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;
  parameters?: TemplateParameters[];
}
