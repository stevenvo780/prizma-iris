import React from 'react';
import Head from 'next/head';

const BASE_URL = 'https://iris.prisma-enterprise.cloud';
const OG_IMAGE = `${BASE_URL}/og-image.png`;
const DEFAULT_DESCRIPTION =
  'Iris, la plataforma de WhatsApp Business API de Prizma: gestiona conversaciones, envía campañas masivas y automatiza respuestas para hacer crecer tu negocio.';

interface SeoHeadProps {
  title?: string;
  description?: string;
  pathname?: string;
  ogImage?: string;
  noIndex?: boolean;
}

/**
 * SeoHead — componente reutilizable de metadatos SEO para todas las páginas de Iris.
 * Provee title, description, canonical, og:* y twitter:* correctos por página.
 */
const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  pathname = '/',
  ogImage = OG_IMAGE,
  noIndex = false,
}) => {
  const fullTitle = title ? `${title} — Iris | Prizma` : 'Iris — Enterprise WhatsApp Messaging | Prizma';
  const canonicalUrl = `${BASE_URL}${pathname === '/' ? '' : pathname}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow" />
      )}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Iris — Prizma" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
};

export default SeoHead;
