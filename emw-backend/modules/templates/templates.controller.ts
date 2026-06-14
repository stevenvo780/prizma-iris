import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateTemplateDto, TemplateParameters } from './dto/create-template.dto';
import { TemplatesService, UpdateTemplateDto } from './templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TemplateCategory, TemplateLanguage, TemplateStatus } from './entities/template.entity';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);
  constructor(private readonly templatesService: TemplatesService) {}

  extractParameters(text: string): TemplateParameters[] {
    const validParameters = Object.values(TemplateParameters);
        const matches = text.match(/{{(.*?)}}/g) || [];
        return matches.map(match => match
          .replace('{{', '').replace('}}', '').trim())
          .filter(parameter => validParameters.includes(parameter));
      }

  @Post()
  async create(@Body() createTemplateDto: {name: string, category: TemplateCategory, body: string, language: TemplateLanguage}, @Request() req) {
    this.logger.log(`Requesting create template for user ${req.user.id}`);
    try {
      const mappedDto: CreateTemplateDto = {
        name: createTemplateDto.name,
        category: createTemplateDto.category,
        body: createTemplateDto.body,
        language: createTemplateDto.language,
        active: true,
        parameters: this.extractParameters(createTemplateDto.body),
      };

      return await this.templatesService.create(mappedDto, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Get()
  async findAll(@Request() req, @Query('status') status?: TemplateStatus) {
    return this.templatesService.findAll(req.user.id, status);
  }

  @Get('approved')
  async getApproved(@Request() req) {
    return this.templatesService.getApprovedTemplates(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.templatesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @Request() req,
  ) {
    try {
      return await this.templatesService.update(id, updateTemplateDto, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    try {
      await this.templatesService.remove(id, req.user.id);
      return { message: 'Template deleted successfully' };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Post(':id/submit')
  async submitForApproval(@Param('id') id: string, @Request() req) {
    try {
      return await this.templatesService.submitForApproval(id, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Post(':id/sync-whatsapp-status')
  async syncWhatsAppStatus(@Param('id') id: string, @Request() req) {
    try {
      return await this.templatesService.syncWhatsAppStatus(id, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Post('sync-all-whatsapp-status')
  async syncAllWhatsAppStatus(@Request() req) {
    try {
      return await this.templatesService.syncAllWhatsAppStatus(req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }
}
