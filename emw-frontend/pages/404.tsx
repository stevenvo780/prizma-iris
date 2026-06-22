import Head from 'next/head';
import Link from 'next/link';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>No encontrado — Iris EMW</title>
      </Head>
      <main style={{ padding: '4rem 1rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>404</h1>
        <p style={{ marginTop: '0.5rem' }}>Página no encontrada.</p>
        <Link href="/" style={{ color: '#2563eb' }}>Volver al inicio</Link>
      </main>
    </>
  );
}
