import { CustomerStatus } from "@/customers/entities/customer.entity";

export interface ResponseCustomerDto {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    status: CustomerStatus;
    language: string;
    timezone: string;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    lastContactAt: Date;
    tags: string[];
    customFields?: Record<string, any>;
}
