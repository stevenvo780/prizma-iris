import React, { FC, ChangeEvent, useState, useEffect } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import Select from 'react-select/creatable';
import { Customer } from '@utils/types';

interface CustomerFormProps {
  customer: Customer;
  labels: { value: string; label: string }[];
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  handleSelectChange: (event: any) => void;
}

const CustomerForm: FC<CustomerFormProps> = ({
  customer,
  labels,
  handleInputChange,
  handleSelectChange,
}) => {
  return (
    <Row>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Select
          placeholder='Etiquetas*'
          isMulti
          instanceId='labels'
          name='tags'
          onChange={handleSelectChange}
          options={labels}
          value={customer.tags ? customer.tags.map(tag => ({ value: tag, label: tag })) : []}
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='firstName'
          value={customer.firstName || ''}
          onChange={handleInputChange}
          placeholder='Nombre *'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='lastName'
          value={customer.lastName || ''}
          onChange={handleInputChange}
          placeholder='Apellido *'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='6'>
        <Form.Control
          type='text'
          name='phoneNumber'
          value={customer.phoneNumber || ''}
          onChange={handleInputChange}
          placeholder='Número de teléfono (ej: +573001234567) *'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='6'>
        <Form.Control
          type='email'
          name='email'
          value={customer.email || ''}
          onChange={handleInputChange}
          placeholder='Email'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='language'
          value={customer.language || ''}
          onChange={handleInputChange}
          placeholder='Idioma (ej: es, en)'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='timezone'
          value={customer.timezone || ''}
          onChange={handleInputChange}
          placeholder='Zona horaria'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Select name='status' value={customer.status || 'active'} onChange={handleInputChange}>
          <option value='active'>Activo</option>
          <option value='inactive'>Inactivo</option>
          <option value='blocked'>Bloqueado</option>
          <option value='opted_out'>Sin suscripción</option>
        </Form.Select>
      </Col>
      <Col style={{ marginTop: 10 }} sm='12'>
        <Form.Control
          as='textarea'
          rows={3}
          name='notes'
          value={customer.notes || ''}
          onChange={handleInputChange}
          placeholder='Notas'
          className='form-control'
        />
      </Col>
    </Row>
  );
};

export default CustomerForm;
