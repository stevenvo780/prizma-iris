import { MessageType } from "../../models/message-log.entity";

export interface SendMessageDto {
  recipientNumber?: string;
  recipientNumbers?: string[];
  customerTags?: string[];
  content?: string;
  templateId?: string;
  templateParams?: string[];
  type: MessageType;
  mediaAttachments?: {
    type: string;
    url: string;
    caption?: string;
    filename?: string;
  }[];
  scheduledAt?: Date;
  priority?: number;

  accountId?: string;
}

export interface BulkSendDto {
  templateId: string;
  recipientNumbers?: string[];
  customerTags?: string[];
  templateParams?: string[];
  scheduledAt?: Date;
  priority?: number;
}
