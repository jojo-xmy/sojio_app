
import './globals.css';
import { ReactNode } from 'react';
import { UserStateInitializer } from '@/components/UserStateInitializer';

export const metadata = {
  title: 'HUG Cleaning App',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserStateInitializer />
        <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button">EN</button>
            <button type="button">JA</button>
            <button type="button">VI</button>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
