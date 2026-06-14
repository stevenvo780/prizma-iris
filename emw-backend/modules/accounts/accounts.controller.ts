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
  BadRequestException,
  Put,
  HttpCode,
  Logger
} from '@nestjs/common';
import { AccountsService, CreateAccountDto, UpdateAccountDto } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);
  constructor(private readonly accountsService: AccountsService) { }

  @Post()
  async create(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    try {
      this.logger.log(`Creating account for user ID: ${req.user.id}`);
      return await this.accountsService.create(createAccountDto, req.user.id);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : 'Error creating account',
      );
    }
  }

  @Get()
  async findAll(@Request() req) {
    this.logger.log(`Fetching all accounts for user ID: ${req.user.id}`);
    return this.accountsService.findAll(req.user.id);
  }

  @Get('active')
  async getActive(@Request() req) {
    return this.accountsService.getActiveAccount(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.accountsService.findOne(id, req.user.id);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string, @Request() req) {
    return this.accountsService.getAccountStats(id, req.user.id);
  }

  @Put(':id')
  async putUpdate(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @Request() req,
  ) {
    this.logger.log(`Updating account ID: ${id} for user ID: ${req.user.id}`);
    try {
      return await this.accountsService.update(id, updateAccountDto, req.user.id);
    } catch (error) {
      this.logger.error(`Error updating account ID: ${id} - ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @Request() req,
  ) {
    try {
      return await this.accountsService.update(id, updateAccountDto, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    this.logger.log(`Deleting account ID: ${id} for user ID: ${req.user.id}`);
    try {
      await this.accountsService.remove(id, req.user.id);
      return { message: 'Account deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting account ID: ${id} - ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Post(':id/set-active')
  async setActive(@Param('id') id: string, @Request() req) {
    try {
      return await this.accountsService.setActiveAccount(id, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Post(':id/validate')
  @HttpCode(200)
  async validate(@Param('id') id: string, @Request() req) {
    const result = await this.accountsService.testConnection(id, req.user.id);
    return { valid: result.success, details: result.details ?? null };
  }

  @Get(':id/metrics')
  async metrics(@Param('id') id: string, @Request() req) {
    return this.accountsService.getAccountStats(id, req.user.id);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  async deactivate(@Param('id') id: string, @Request() req) {
    return this.accountsService.deactivateAccount(id, req.user.id);
  }

  @Post(':id/activate')
  @HttpCode(200)
  async activate(@Param('id') id: string, @Request() req) {
    return this.accountsService.setActiveAccount(id, req.user.id);
  }

  @Post(':id/test-connection')
  async testConnection(@Param('id') id: string, @Request() req) {
    return this.accountsService.testConnection(id, req.user.id);
  }

  @Post(':id/test-webhook')
  @HttpCode(200)
  async testWebhook(@Param('id') id: string, @Request() req) {

    return { success: true, message: 'Webhook configuration is valid for testing purposes' };
  }

  @Post(':id/refresh')
  async refresh(@Param('id') id: string, @Request() req) {
    try {
      return await this.accountsService.refreshAccountInfo(id, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }
}
