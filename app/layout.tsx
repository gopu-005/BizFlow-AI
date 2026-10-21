import type { Metadata } from 'next';
import './globals.css';
import { BusinessProvider } from '@/components/BusinessProvider';
import { NavigationDrawers } from '@/components/NavigationDrawers';

export const metadata: Metadata = {
  title: 'BizFlow AI — One-Screen Conversational ERP',
  description:
    'Lightweight conversational ERP for small businesses, retailers, clothing shops, bakeries, and growing businesses. Type or speak in Tamil and English to manage sales, invoices, inventory, and reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#fbfbfe] text-[#0f172a] antialiased min-h-screen selection:bg-purple-200 selection:text-purple-900">
        <BusinessProvider>
          {children}
          {/* Shared Operations / Connectors side drawers — available on every app page */}
          <NavigationDrawers />
        </BusinessProvider>
      </body>
    </html>
  );
}
