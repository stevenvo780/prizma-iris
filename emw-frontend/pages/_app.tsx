import React from 'react';
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../src/store';
import Layout from '../src/components/Layout';
import { ThemeProvider } from 'prizma-ui';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'prizma-tokens/prizma.css';
import '../src/styles/globals.css';
import 'prizma-ui/styles.css';
import '../src/styles/prizma-brand.css';
import { useRouter } from 'next/router';

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAuthPage = router.pathname === '/login' || router.pathname === '/login/Register';

  if (isAuthPage) {
    return <Component {...pageProps} />;
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default function MyApp(appProps: AppProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider defaultTheme="light">
          <div className="cui-root" data-module="iris">
            <AppContent {...appProps} />
          </div>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
