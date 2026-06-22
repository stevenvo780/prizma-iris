import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang='es'>
      <Head>
        <meta name='description' content='Iris EMW by Prizma: gestión de WhatsApp Marketing, campañas masivas y atención al cliente en un solo lugar.' />
        <meta name='robots' content='index,follow' />
        <link rel='canonical' href='https://iris.prisma-enterprise.cloud' />
        <meta property='og:title' content='Iris EMW — Prizma' />
        <meta property='og:description' content='Iris EMW by Prizma: gestión de WhatsApp Marketing, campañas masivas y atención al cliente en un solo lugar.' />
        <meta property='og:url' content='https://iris.prisma-enterprise.cloud' />
        <meta property='og:image' content='https://iris.prisma-enterprise.cloud/og-image.png' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' />
        <link rel='icon' type='image/png' sizes='32x32' href='/favicon-32.png' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
