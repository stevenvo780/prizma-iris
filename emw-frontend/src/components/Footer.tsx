import React from 'react';
import { Container, Row } from 'react-bootstrap';

const Footer = () => (
  <Container
    fluid
    className='footer-container'
    style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end' }}
  >
    <Row style={{ width: '100%' }}>
      <p style={{ margin: '0', textAlign: 'right' }}>
        © {new Date().getFullYear()} PRIZMA · Iris — Enterprise WhatsApp Messaging.
      </p>
    </Row>
  </Container>
);

export default Footer;
