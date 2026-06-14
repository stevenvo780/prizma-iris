import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomersService, CreateCustomerDto, UpdateCustomerDto, ImportCustomersDto } from './customers.service';
import { Express } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerStatus } from './entities/customer.entity';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    try {
      return await this.customersService.create(createCustomerDto, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: CustomerStatus,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      status,
      tags: tags ? tags.split(',') : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    return this.customersService.findAll(req.user.id, filters);
  }

  @Get('tags')
  async getTags(@Request() req) {
    return this.customersService.getTagsList(req.user.id);
  }

  @Get('labels')
  async getLabels(@Request() req) {
    try {
      const tags = await this.customersService.getTagsList(req.user.id);
      return tags;
    } catch (error) {
      this.logger.error('Error getting labels:', error);
      return ['Cliente Premium', 'Cliente Regular', 'Prospecto'];
    }
  }

  @Get('opted-in')
  async getOptedIn(@Request() req) {
    return this.customersService.getOptedInCustomers(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.customersService.findOne(id, req.user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ) {
    try {
      return await this.customersService.update(id, updateCustomerDto, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    try {
      await this.customersService.remove(id, req.user.id);
      return { message: 'Customer deleted successfully' };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Post('import')
  async import(@Body() importCustomersDto: ImportCustomersDto, @Request() req) {
    try {
      return await this.customersService.importCustomers(importCustomersDto, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  async importFromCsv(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const csvData = file.buffer.toString();
      const lines = csvData.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      const customers: CreateCustomerDto[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 3) {
          const customer: CreateCustomerDto = {
            firstName: values[0],
            lastName: values[1],
            phoneNumber: values[2],
            email: values[3] || undefined,
            tags: values[4] ? values[4].split(';') : undefined,
          };
          customers.push(customer);
        }
      }

      return await this.customersService.importCustomers({ customers }, req.user.id);
    } catch (error) {
      throw new BadRequestException(
        `Error processing CSV: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Post('filter-by-tags')
  async filterByTags(@Body() body: { tags: string[] }, @Request() req) {
    return this.customersService.getByTags(req.user.id, body.tags);
  }

  @Post('scheduler')
  async scheduleMessages(@Body() body: { labels: string[] }, @Request() req) {
    this.logger.log(`Scheduling messages for user ${req.user.id} with labels: ${body.labels.join(', ')}`);
    try {
      return await this.customersService.scheduleMessagesByTags(req.user.id, body.labels);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }
}
