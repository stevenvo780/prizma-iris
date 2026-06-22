export default function Error({ statusCode }: { statusCode?: number }) {
  return (
    <main style={{ padding: '4rem 1rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{statusCode || 500}</h1>
      <p style={{ marginTop: '0.5rem' }}>
        {statusCode === 404
          ? 'Página no encontrada.'
          : 'Error interno del servidor.'}
      </p>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  return { props: { statusCode: context.res?.statusCode || 500 } };
}
