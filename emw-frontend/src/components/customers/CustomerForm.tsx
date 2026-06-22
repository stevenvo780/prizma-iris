import React, { FC, ChangeEvent } from 'react';
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

  const customerTags = (customer as any).tags;
  const getTagsValue = () => {
    if (customerTags && customerTags.length > 0) {
      return customerTags.map((tag: string) => ({ value: tag, label: tag }));
    }
    if (customer.tagAssignments && customer.tagAssignments.length > 0) {
      return customer.tagAssignments.map(ta => ({ value: ta.tag.name, label: ta.tag.name }));
    }
    return [];
  };

  return (
    <Row>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Select
          placeholder='Etiquetas'
          isMulti
          instanceId='tags'
          name='tags'
          onChange={handleSelectChange}
          options={labels}
          value={getTagsValue()}
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='phoneNumber'
          value={customer.phoneNumber || ''}
          onChange={handleInputChange}
          placeholder='Teléfono * (ej: +573001234567)'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
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
          name='firstName'
          value={customer.firstName || ''}
          onChange={handleInputChange}
          placeholder='Nombre'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='lastName'
          value={customer.lastName || ''}
          onChange={handleInputChange}
          placeholder='Apellido'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          as='select'
          name='status'
          value={customer.status || 'active'}
          onChange={handleInputChange}
        >
          <option value='active'>Activo</option>
          <option value='inactive'>Inactivo</option>
          <option value='blocked'>Bloqueado</option>
        </Form.Control>
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='companyName'
          value={(customer as any).companyName || customer.customFields?.company || ''}
          onChange={handleInputChange}
          placeholder='Empresa'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='title'
          value={(customer as any).title || customer.customFields?.title || ''}
          onChange={handleInputChange}
          placeholder='Título / Cargo'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='campaign'
          value={(customer as any).campaign || customer.customFields?.campaign || ''}
          onChange={handleInputChange}
          placeholder='Campaña'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='data1'
          value={(customer as any).data1 || customer.customFields?.data1 || ''}
          onChange={handleInputChange}
          placeholder='Dato 1'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='data2'
          value={(customer as any).data2 || customer.customFields?.data2 || ''}
          onChange={handleInputChange}
          placeholder='Dato 2'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='4'>
        <Form.Control
          type='text'
          name='data3'
          value={(customer as any).data3 || customer.customFields?.data3 || ''}
          onChange={handleInputChange}
          placeholder='Dato 3'
          className='form-control'
        />
      </Col>
      <Col style={{ marginTop: 10 }} sm='12'>
        <Form.Control
          as='textarea'
          rows={3}
          name='notes'
          value={customer.notes || ''}
          onChange={handleInputChange}
          placeholder='Notas adicionales'
          className='form-control'
        />
      </Col>
    </Row>
  );
};

export default CustomerForm;
