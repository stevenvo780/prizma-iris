import React, { useEffect, useRef, useState } from 'react';
import { NextPageContext, NextComponentType } from 'next';
import useUser from '@store/user';
import { useRouter } from 'next/router';

const getDisplayName = (Component: NextComponentType) =>
  Component.displayName || Component.name || 'Component';

export const withAuthSync = (WrappedComponent: NextComponentType<any>) => {
  const Wrapper = (props: any) => {
    const { isAuthenticated, fetchUser, token, autoLoginForDev } = useUser();
    const router = useRouter();
    const hasCheckedRef = useRef(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
      if (hasCheckedRef.current) return;
      hasCheckedRef.current = true;

      if (isAuthenticated()) {
        setChecking(false);
        return;
      }

      if (token) {
        fetchUser()
          .catch(() => {
            router.replace('/login');
          })
          .finally(() => setChecking(false));
        return;
      }

      if (process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true') {
        (async () => {
          await autoLoginForDev();

          setChecking(false);
        })();
      } else {

        if (router.pathname !== '/login') {
          router.replace('/login');
        }
        setChecking(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (checking) return null;

    if (!isAuthenticated()) return null;

    return <WrappedComponent {...props} />;
  };

  Wrapper.displayName = `withAuthSync(${getDisplayName(WrappedComponent)})`;

  if (WrappedComponent.getInitialProps) {
    Wrapper.getInitialProps = async (ctx: NextPageContext) => {
      const componentProps =
        WrappedComponent.getInitialProps && (await WrappedComponent.getInitialProps(ctx));
      return { ...componentProps };
    };
  }

  return Wrapper;
};
