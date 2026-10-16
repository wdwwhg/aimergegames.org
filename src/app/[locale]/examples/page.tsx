import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { publicMetadata } from '@/lib/games/metadata';
import { ExampleSection, MergeShell } from '@/blocks/merge-site';

export const metadata = publicMetadata(
  '/examples',
  'Play original game mashups free | AI Merge Games',
  'Explore Moss Knight, Portal Hop, and Meadow Survivor: three original handcrafted game mashups. Play in your browser without an account.'
);
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en') redirect('/examples');
  setRequestLocale(locale);
  return (
    <MergeShell>
      <ExampleSection standalone />
    </MergeShell>
  );
}
