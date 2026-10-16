import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { publicMetadata } from '@/lib/games/metadata';
import { MergeShell, PricingContent } from '@/blocks/merge-site';

export const metadata = publicMetadata(
  '/pricing',
  'Generation credits & pricing | AI Merge Games',
  'Play premade examples free. Trial generations and optional one-time credit packs are planned. Purchases are not open yet.'
);
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en') redirect('/pricing');
  setRequestLocale(locale);
  return (
    <MergeShell>
      <PricingContent />
    </MergeShell>
  );
}
