import React, { FC } from 'react';
import { Row, Col, Button, Badge } from 'react-bootstrap';
import { Customer } from '@utils/types';

interface CustomerListProps {
  customers: Customer[];
  handleShowModal: (customer: Customer) => void;
  updateCustomerSelect: (id: number) => void;
  deleteCustomer: (id: number) => void;
}

const getCustomerTags = (customer: Customer): string[] => {

  if ((customer as any).tags && Array.isArray((customer as any).tags)) {
    return (customer as any).tags;
  }

  if (customer.tagAssignments && Array.isArray(customer.tagAssignments)) {
    return customer.tagAssignments
      .map(ta => ta.tag?.name || ta.tagId?.toString() || '')
      .filter(name => name !== '');
  }
  return [];
};

const CustomerList: FC<CustomerListProps> = ({
  customers,
  handleShowModal,
  updateCustomerSelect,
  deleteCustomer,
}) => {
  const safeCustomers = Array.isArray(customers) ? customers : [];

  return (
    <Row>
      {safeCustomers.map((i: Customer) => {
        const tags = getCustomerTags(i);
        return (
          <Col sm='4' key={i.id ?? i.phoneNumber ?? Math.random()} style={{ marginBottom: 20 }}>
            <div className='card'>
              <div className='card-body'>
                <Row>
                  <Col xs='12' sm='12' className='mb-2'>
                    {tags.length > 0 ? (
                      tags.map((tag, idx) => (
                        <Badge
                          key={idx}
                          bg='info'
                          className='me-1'
                          style={{ fontSize: '0.75rem' }}
                        >
                          {tag}
                        </Badge>
                      ))
                    ) : null}
                  </Col>
                  <Col xs='6' sm='6'>
                    <p className='card-text mb-1'>
                      <strong>{i.firstName} {i.lastName}</strong>
                    </p>
                  </Col>
                  <Col xs='6' sm='6'>
                    <p className='card-text mb-1 text-muted'>{i.phoneNumber}</p>
                  </Col>
                  <Col sm='12' className='mt-2'>
                    <Button
                      size='sm'
                      style={{ marginRight: 8 }}
                      variant='warning'
                      onClick={() => handleShowModal(i)}
                    >
                      Ver
                    </Button>
                    <Button
                      size='sm'
                      style={{ marginRight: 8 }}
                      variant='secondary'
                      onClick={() => {
                        updateCustomerSelect(i.id ? i.id : 0);
                      }}
                    >
                      Actualizar
                    </Button>
                    <Button
                      size='sm'
                      variant='secondary'
                      onClick={() => deleteCustomer(i.id ? i.id : 0)}
                    >
                      Eliminar
                    </Button>
                  </Col>
                </Row>
              </div>
            </div>
          </Col>
        );
      })}
    </Row>
  );
};

export default CustomerList;
