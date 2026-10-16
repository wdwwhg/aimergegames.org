import type { Metadata } from 'next';
import { Inter, Libre_Baskerville } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';

import { routing } from '@/core/i18n/config';
import { envConfigs } from '@/config';
import { Ads } from '@/components/ads';
import { Analytics } from '@/components/analytics';
import { CustomerService } from '@/components/customer-service';
import { GoogleOneTap } from '@/components/google-one-tap';
import { Toaster } from '@/components/ui/sonner';

import '../globals.css';
import '../merge.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif-display',
});
export const metadata: Metadata = {
  metadataBase: new URL(envConfigs.app_url || 'http://localhost:3000'),
  title: {
    default: envConfigs.app_name,
    template: `%s | ${envConfigs.app_name}`,
  },
  description: envConfigs.app_description,
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    siteName: envConfigs.app_name,
    type: 'website',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${libreBaskerville.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
          <Toaster position="top-center" richColors />
          <GoogleOneTap />
        </ThemeProvider>
        <Ads />
        <Analytics />
        <CustomerService />
      </body>
    </html>
  );
}
