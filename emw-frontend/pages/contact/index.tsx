import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import Image from 'next/image';
import { FaEnvelope, FaWhatsapp, FaGlobe } from 'react-icons/fa';
import styles from '@styles/Contact.module.css';
import contact_us from '@public/img/FondoContacto.png';

const Contact: React.FC = () => {
  const handleMailClick = () => {
    window.location.href = 'mailto:sales@humanizar.co';
  };

  const handleWhatsAppClick = () => {
    window.open('https://api.whatsapp.com/send/?phone=%2B573246780067', '_blank');
  };

  const handleWebClick = () => {
    window.open('https://www.humanizar.co', '_blank');
  };

  return (
    <Container fluid className={styles.contactContainer}>
      <Row className='justify-content-center text-center'>
        <Col md={12} className='my-4'>
          <Image fetchPriority='high' src={contact_us} alt='Contáctanos' width={400} height={250} />
        </Col>
        <Col md={12} className='my-4'>
          <h2>Contáctanos</h2>
          <p>
            Para más información o cualquier consulta, no dudes en contactarnos a través de los
            siguientes medios:
          </p>
        </Col>
        <Col md={4} className='my-2'>
          <Button onClick={handleMailClick} className={styles.contactButton}>
            <FaEnvelope className={styles.icon} size={30} />
            sales@humanizar.co
          </Button>
        </Col>
        <Col md={4} className='my-2'>
          <Button onClick={handleWhatsAppClick} className={styles.contactButton}>
            <FaWhatsapp className={styles.icon} size={30} />
            +57 324 6780067
          </Button>
        </Col>
        <Col md={4} className='my-2'>
          <Button onClick={handleWebClick} className={styles.contactButton}>
            <FaGlobe className={styles.icon} size={30} />
            www.humanizar.co
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default Contact;
