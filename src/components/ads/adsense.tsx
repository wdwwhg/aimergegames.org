// Google AdSense as native tags — same rationale as analytics/plausible.tsx
// for avoiding next/script (RSC-only emission breaks View Source + crawlers
// + delays script load until hydration). React 19 hoists <meta> and async
// <script> into <head> automatically.
export function Adsense({ adId }: { adId: string }) {
  if (!adId) return null;
  return (
    <>
      <meta name="google-adsense-account" content={adId} />
      <script
        id="adsense-loader"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adId}`}
        async
        crossOrigin="anonymous"
      />
    </>
  );
}
