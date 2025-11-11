
import './globals.css';
import { ReactNode } from 'react';
import { UserStateInitializer } from '@/components/UserStateInitializer';

export const metadata = {
  title: 'SoJio Clean Hub',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserStateInitializer />

        <main>{children}</main>
      </body>
    </html>
  );
}
