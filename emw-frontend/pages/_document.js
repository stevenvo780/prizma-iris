import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang='es'>
        <Head>
          <title>Iris EMW — Prizma</title>
          <meta name='description' content='Iris EMW by Prizma: gestión de WhatsApp Marketing, campañas masivas y atención al cliente en un solo lugar.' />
          <meta name='robots' content='index,follow' />
          <link rel='canonical' href='https://iris.prisma-enterprice.cloud' />
          <meta property='og:title' content='Iris EMW — Prizma' />
          <meta property='og:description' content='Iris EMW by Prizma: gestión de WhatsApp Marketing, campañas masivas y atención al cliente en un solo lugar.' />
          <meta property='og:url' content='https://iris.prisma-enterprice.cloud' />
          <meta property='og:image' content='https://iris.prisma-enterprice.cloud/img/prizma-favicon.svg' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <link rel='icon' href='/img/prizma-favicon.svg' />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
