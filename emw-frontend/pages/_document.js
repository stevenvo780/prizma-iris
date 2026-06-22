import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang='es'>
      <Head>
        <meta name='description' content='Iris, la plataforma de WhatsApp Business API de Prizma: gestiona conversaciones, envía campañas masivas y automatiza respuestas para hacer crecer tu negocio.' />
        <meta name='robots' content='index,follow' />
        <link rel='canonical' href='https://iris.prisma-enterprise.cloud' />
        <meta property='og:type' content='website' />
        <meta property='og:title' content='Iris — Enterprise WhatsApp Messaging | Prizma' />
        <meta property='og:description' content='Iris, la plataforma de WhatsApp Business API de Prizma: gestiona conversaciones, envía campañas masivas y automatiza respuestas para hacer crecer tu negocio.' />
        <meta property='og:url' content='https://iris.prisma-enterprise.cloud' />
        <meta property='og:image' content='https://iris.prisma-enterprise.cloud/og-image.png' />
        <meta property='og:image:width' content='1200' />
        <meta property='og:image:height' content='630' />
        <meta property='og:site_name' content='Iris — Prizma' />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' />
        <link rel='icon' type='image/png' sizes='32x32' href='/favicon-32.png' />
        <link rel='icon' type='image/png' sizes='16x16' href='/favicon-32.png' />
        <link rel='apple-touch-icon' sizes='180x180' href='/apple-touch-icon.png' />
        <link rel='manifest' href='/site.webmanifest' />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
