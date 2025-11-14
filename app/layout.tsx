
import './globals.css';
import { ReactNode } from 'react';
import { UserStateInitializer } from '@/components/UserStateInitializer';
import { LanguageProvider } from '@/components/providers/LanguageProvider';

export const metadata = {
  title: 'SoJio Clean Hub',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body data-auto-translate-root="true">
        <LanguageProvider>
          <UserStateInitializer />
          <main>{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
