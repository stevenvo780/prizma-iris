import { ReactNode } from 'react';
import { GetServerSideProps } from 'next';

interface HomeProps {}

export default function Home(props: HomeProps): ReactNode {
  // This page redirects to /login via getServerSideProps
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    redirect: {
      destination: '/login',
      permanent: false,
    },
  };
};
