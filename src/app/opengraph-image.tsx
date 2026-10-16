import { ImageResponse } from 'next/og';

import { envConfigs } from '@/config';

export const runtime = 'edge';
export const alt = 'AI Merge Games — Create Playable Game Mashups';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#f3f6eb',
        padding: 75,
        fontFamily: 'sans-serif',
        flexDirection: 'column',
        justifyContent: 'center',
        color: '#2c4a38',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 23,
          letterSpacing: 5,
          color: '#7d9470',
        }}
      >
        TWO INSPIRATIONS. ONE ORIGINAL GAME.
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 87,
          fontWeight: 700,
          letterSpacing: -5,
          marginTop: 35,
        }}
      >
        {envConfigs.app_name}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 36,
          color: '#789268',
          marginTop: 25,
        }}
      >
        Big what-if energy.
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 21,
          color: '#8b9b7e',
          marginTop: 65,
        }}
      >
        Play original 2D mashups in your browser.
      </div>
    </div>,
    size
  );
}
