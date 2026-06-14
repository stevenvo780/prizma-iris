import React, { FC } from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import { Customer } from '@utils/types';

interface CustomerListProps {
  customers: Customer[];
  handleShowModal: (customer: Customer) => void;
  updateCustomerSelect: (id: number) => void;
  deleteCustomer: (id: number) => void;
}

const CustomerList: FC<CustomerListProps> = ({
  customers,
  handleShowModal,
  updateCustomerSelect,
  deleteCustomer,
}) => {
  const safeCustomers = Array.isArray(customers) ? customers : [];

  return (
    <Row>
      {safeCustomers.map((i: Customer) => (
        <Col sm='4' key={i.id ?? i.phoneNumber ?? Math.random()} style={{ marginBottom: 20 }}>
          <div className='card'>
            <div className='card-body'>
              <Row>
                <Col xs='4' sm='4'>
                  <p>
                    {i.tags &&
                      Array.isArray(i.tags) &&
                      i.tags.map((tag: string, tagIdx) => <span key={tag + tagIdx}>{tag} </span>)}
                  </p>
                </Col>
                <Col xs='4' sm='4'>
                  <p className='card-text'>
                    {i.firstName} {i.lastName}
                  </p>
                </Col>
                <Col xs='4' sm='4'>
                  <p className='card-text'>{i.phoneNumber}</p>
                </Col>
                <Col sm='12'>
                  <Button
                    style={{ marginRight: 10 }}
                    variant='warning'
                    onClick={() => handleShowModal(i)}
                    className='btn btn-secondary'
                  >
                    Ver
                  </Button>
                  <Button
                    style={{ marginRight: 10 }}
                    variant='secondary'
                    onClick={() => {
                      updateCustomerSelect(i.id ? i.id : 0);
                    }}
                    className='btn btn-secondary'
                  >
                    Actualizar
                  </Button>
                  <Button
                    style={{ marginRight: 10 }}
                    variant='secondary'
                    onClick={() => deleteCustomer(i.id ? i.id : 0)}
                    className='btn btn-secondary'
                  >
                    Eliminar
                  </Button>
                </Col>
              </Row>
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );
};

export default CustomerList;
