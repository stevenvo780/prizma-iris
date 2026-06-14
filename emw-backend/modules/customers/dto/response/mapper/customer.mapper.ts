import { Customer } from "@/customers/entities/customer.entity";
import { ResponseCustomerDto } from "../customer";

export function mapCustomersToResponseDtos(customers: Customer[]): ResponseCustomerDto[] {
    return customers.map(mapCustomerToResponseDto);
}

export function mapCustomerToResponseDto(customer: Customer): ResponseCustomerDto {
    return {
      id: customer.id,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      status: customer.status,
      language: customer.language,
      timezone: customer.timezone,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      lastContactAt: customer.lastContactAt,
      tags: customer.tagAssignments?.map((tagAssignment) => tagAssignment.tag?.name).filter(Boolean) || [],
      customFields: customer.customFields || {},
    };
}
