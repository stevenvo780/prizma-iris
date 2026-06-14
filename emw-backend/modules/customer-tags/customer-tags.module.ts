import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTag } from './entities/customer-tag.entity';
import { CustomerTagAssignment } from './entities/customer-tag-assignment.entity';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerTag, CustomerTagAssignment, Customer])],
  controllers: [],
  providers: [],
  exports: [],
})
export class CustomerTagsModule {}
