import { getAllConfigs } from '@/modules/config/service';

import { Adsense } from './adsense';

// Server component — reads the merged env+DB config (1h-cached in the
// config service) and renders whichever ads provider has a non-empty ID
// configured. Drop this into the root layout's <body> next to <Analytics />.
export async function Ads() {
  const configs = await getAllConfigs();
  const adsenseCode = configs.adsense_code?.trim();

  if (!adsenseCode) return null;

  return <Adsense adId={adsenseCode} />;
}
