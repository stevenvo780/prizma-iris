import React from 'react';
import Head from 'next/head';
import { Container, Row, Col } from 'react-bootstrap';
import Image from 'next/image';
import { FaEnvelope, FaWhatsapp, FaGlobe } from 'react-icons/fa';
import styles from '@styles/Contact.module.css';
import contact_us from '@public/img/FondoContacto.png';

const Contact: React.FC = () => {
  return (
    <Container fluid className={styles.contactContainer}>
      <Head>
        <title>Contacto | Iris</title>
      </Head>
      <Row className='justify-content-center text-center'>
        <Col md={12} className='my-4'>
          <Image fetchPriority='high' src={contact_us} alt='Contáctanos' width={400} height={250} />
        </Col>
        <Col md={12} className='my-4'>
          <h1 style={{ fontSize: '1.75rem' }}>Contáctanos</h1>
          <p>
            Para más información o cualquier consulta, no dudes en contactarnos a través de los
            siguientes medios:
          </p>
        </Col>
        <Col md={4} className='my-2'>
          <a
            href='mailto:stevenvallejo780@gmail.com'
            className={styles.contactButton}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <FaEnvelope className={styles.icon} size={30} aria-hidden='true' />
            stevenvallejo780@gmail.com
          </a>
        </Col>
        <Col md={4} className='my-2'>
          <a
            href='https://api.whatsapp.com/send/?phone=%2B573246780067'
            target='_blank'
            rel='noreferrer'
            className={styles.contactButton}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <FaWhatsapp className={styles.icon} size={30} aria-hidden='true' />
            +57 324 6780067
          </a>
        </Col>
        <Col md={4} className='my-2'>
          <a
            href='https://prisma-enterprice.cloud'
            target='_blank'
            rel='noreferrer'
            className={styles.contactButton}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <FaGlobe className={styles.icon} size={30} aria-hidden='true' />
            Steven Vallejo
          </a>
        </Col>
      </Row>
    </Container>
  );
};

export default Contact;
