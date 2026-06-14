import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService, SendChatMessageDto } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /api/chat/send
   * Envía un mensaje de texto o media por WhatsApp y lo guarda en Firestore.
   */
  @Post('send')
  async sendMessage(@Body() dto: SendChatMessageDto, @Request() req: any) {
    this.logger.log(
      `💬 Chat send: user=${req.user.id} to=${dto.phoneNumber} type=${dto.type || 'text'}`,
    );
    return this.chatService.sendMessage(dto, req.user.id);
  }

  /**
   * GET /api/chat/conversations
   * Lista todas las conversaciones del usuario (desde Firestore).
   */
  @Get('conversations')
  async getConversations(@Request() req: any) {
    return this.chatService.getConversations(req.user.id);
  }

  /**
   * GET /api/chat/messages/:phoneNumber
   * Obtiene los mensajes de una conversación.
   */
  @Get('messages/:phoneNumber')
  async getMessages(
    @Param('phoneNumber') phoneNumber: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.chatService.getMessages(phoneNumber, req.user.id, limit ? parseInt(limit) : 50);
  }

  /**
   * POST /api/chat/read/:phoneNumber
   * Marca la conversación como leída (reset unreadCount).
   */
  @Post('read/:phoneNumber')
  async markRead(@Param('phoneNumber') phoneNumber: string, @Request() req: any) {
    return this.chatService.markRead(phoneNumber, req.user.id);
  }
}
