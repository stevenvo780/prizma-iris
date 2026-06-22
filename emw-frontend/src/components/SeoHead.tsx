import React from 'react';
import Head from 'next/head';

const BASE_URL = 'https://iris.prisma-enterprise.cloud';
const OG_IMAGE = `${BASE_URL}/og-image.png`;
const DEFAULT_TITLE = 'PRIZMA · Iris Login';
const DEFAULT_DESCRIPTION =
  'Inicia sesión en Iris, la plataforma de WhatsApp Business API de PRIZMA: gestiona conversaciones, envía campañas masivas y automatiza respuestas para hacer crecer tu negocio.';

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
  const fullTitle = title ? `${title} · PRIZMA · Iris` : DEFAULT_TITLE;
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
      <meta property="og:locale" content="es_CO" />
      <meta property="og:site_name" content="PRIZMA · Iris" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="PRIZMA · Iris — Plataforma WhatsApp Business API" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@prizma_cloud" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content="PRIZMA · Iris — Plataforma WhatsApp Business API" />

      {/* JSON-LD Organization schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'PRIZMA · Iris',
            description: DEFAULT_DESCRIPTION,
            url: BASE_URL,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              priceCurrency: 'COP',
              price: '88000',
            },
            provider: {
              '@type': 'Organization',
              name: 'PRIZMA',
              url: 'https://prisma-enterprise.cloud',
            },
          }),
        }}
      />
    </Head>
  );
};

export default SeoHead;
