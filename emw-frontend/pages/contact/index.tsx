import React from 'react';
import Image from 'next/image';
import { FaEnvelope, FaWhatsapp, FaGlobe } from 'react-icons/fa';
import styles from '@styles/Contact.module.css';
import contact_us from '@public/img/FondoContacto.png';
import SeoHead from '@components/SeoHead';

const Contact: React.FC = () => {
  return (
    <div className={styles.contactContainer}>
      <SeoHead title="Contacto" description="Contacta al equipo de Iris — Prizma: soporte técnico prioritario, WhatsApp y correo electrónico." pathname="/contact" />
      <div className='d-flex flex-column align-items-center text-center'>
        <div className='my-4'>
          <Image fetchPriority='high' src={contact_us} alt='Contáctanos' width={400} height={250} />
        </div>
        <div className='my-4'>
          <h1 style={{ fontSize: '1.75rem' }}>Contáctanos</h1>
          <p>
            Para más información o cualquier consulta, no dudes en contactarnos a través de los
            siguientes medios:
          </p>
        </div>
        <div className='d-flex flex-wrap justify-content-center gap-3 my-2'>
          <a
            href='mailto:stevenvallejo780@gmail.com'
            className={styles.contactButton}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <FaEnvelope className={styles.icon} size={30} aria-hidden='true' />
            stevenvallejo780@gmail.com
          </a>
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
          <a
            href='https://prisma-enterprise.cloud'
            target='_blank'
            rel='noreferrer'
            className={styles.contactButton}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <FaGlobe className={styles.icon} size={30} aria-hidden='true' />
            Steven Vallejo
          </a>
        </div>
      </div>
    </div>
  );
};

export async function getStaticProps() {
  return { props: {}, revalidate: 1 };
}

export default Contact;
