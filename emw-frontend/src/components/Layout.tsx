import React, { ReactNode, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Events from '@components/Events';
import PremiumBanner from '@components/PremiumBanner';
import useUser from '@store/user';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { token, renewToken, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(renewToken, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [renewToken]);

  return (
    <div className='main-container'>
      <Events />
      {token && <Header />}
      {token && user?.role === 'user' && (
        <PremiumBanner />
      )}
      <main className='main-content'>{children}</main>
      {token && router.pathname !== '/chat' && <Footer />}
    </div>
  );
};

export default Layout;
