import { NextResponse } from 'next/server';

import { getAllConfigs } from '@/modules/config/service';

export const dynamic = 'force-dynamic';

// Serves /ads.txt for Google AdSense verification. The publisher ID comes
// from the admin-configured `adsense_code` (e.g. "ca-pub-1234567890123456"
// → "pub-1234567890123456"). Empty 200 when AdSense isn't configured.
export async function GET() {
  try {
    const configs = await getAllConfigs();
    const adsenseCode = configs.adsense_code?.trim();

    if (!adsenseCode) {
      throw new Error('adsense_code is not set');
    }

    const publisherId = adsenseCode.replace('ca-', '');
    const content = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;

    return new NextResponse(content, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch {
    return new NextResponse('', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
