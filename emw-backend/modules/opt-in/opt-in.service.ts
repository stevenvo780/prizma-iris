import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerStatus } from '../customers/entities/customer.entity';

@Injectable()
export class OptInService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async getOptInStatus(phoneNumber: string, userId: string) {
    const customer = await this.customerRepository.findOne({
      where: { phoneNumber, userId },
    });

    if (!customer) {
      return {
        phoneNumber,
        optedIn: false,
        status: 'not_found',
        lastUpdate: null,
      };
    }

    return {
      phoneNumber: customer.phoneNumber,
      optedIn: customer.status === CustomerStatus.ACTIVE && customer.optInAt !== null,
      status: customer.status,
      optInAt: customer.optInAt,
      optOutAt: customer.optOutAt,
      lastUpdate: customer.updatedAt,
    };
  }

  async setOptInStatus(phoneNumber: string, optIn: boolean, userId: string, source?: string) {
    let customer = await this.customerRepository.findOne({
      where: { phoneNumber, userId },
    });

    const now = new Date();

    if (!customer) {

      customer = this.customerRepository.create({
        phoneNumber,
        userId,
        firstName: 'Unknown',
        lastName: 'User',
        status: optIn ? CustomerStatus.ACTIVE : CustomerStatus.OPTED_OUT,
        optInAt: optIn ? now : null,
        optOutAt: optIn ? null : now,
        metadata: { optInSource: source || 'api' },
      });
    } else {

      customer.status = optIn ? CustomerStatus.ACTIVE : CustomerStatus.OPTED_OUT;
      customer.optInAt = optIn ? now : customer.optInAt;
      customer.optOutAt = optIn ? null : now;
      customer.metadata = {
        ...customer.metadata,
        optInSource: source || 'api',
        lastOptUpdate: now.toISOString(),
      };
    }

    await this.customerRepository.save(customer);

    return {
      phoneNumber: customer.phoneNumber,
      optedIn: customer.status === CustomerStatus.ACTIVE && customer.optInAt !== null,
      status: customer.status,
      optInAt: customer.optInAt,
      optOutAt: customer.optOutAt,
      updated: true,
      timestamp: now.toISOString(),
    };
  }
}
