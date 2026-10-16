'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, RotateCcw, X } from 'lucide-react';

import { envConfigs } from '@/config';
import type { GameOutput } from '@/lib/games/types';

export type PlayerLabels = {
  restart: string;
  loading: string;
  error: string;
  instructions: string;
  fullscreen: string;
  close: string;
};
export function GamePlayer({
  game,
  labels,
}: {
  game: GameOutput;
  labels: PlayerLabels;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const nonce = useRef('');
  const [status, setStatus] = useState('loading');
  const [expanded, setExpanded] = useState(false);
  const origin = envConfigs.game_runner_origin;
  function send(type: string) {
    ref.current?.contentWindow?.postMessage(
      {
        type,
        nonce: nonce.current,
        ...(type === 'load' ? { code: game.code } : {}),
      },
      origin
    );
  }
  useEffect(() => {
    nonce.current = crypto.randomUUID();
    setStatus('loading');
    const onMessage = (e: MessageEvent) => {
      if (
        e.origin !== origin ||
        e.source !== ref.current?.contentWindow ||
        e.data?.nonce !== nonce.current
      )
        return;
      if (e.data.type === 'frame') setStatus('ready');
      if (e.data.type === 'error') setStatus('error');
    };
    window.addEventListener('message', onMessage);
    const timeout = setTimeout(
      () => setStatus((s) => (s === 'loading' ? 'error' : s)),
      8000
    );
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timeout);
    };
  }, [game.code, origin]);
  if (
    typeof window !== 'undefined' &&
    new URL(origin).origin === window.location.origin
  )
    return <div role="alert">{labels.error}</div>;
  return (
    <div className={`game-player ${expanded ? 'player-expanded' : ''}`}>
      <div className="player-bar">
        <div>
          <span className="live-dot" /> {game.title}
        </div>
        <div className="player-actions">
          <button
            onClick={() => {
              setStatus('loading');
              send('restart');
            }}
            aria-label={labels.restart}
          >
            <RotateCcw size={15} />
            <span>{labels.restart}</span>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? labels.close : labels.fullscreen}
          >
            {expanded ? <X size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>
      <div className="player-stage">
        <iframe
          key={game.code}
          ref={ref}
          src={origin}
          title={game.title}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          onLoad={() => send('load')}
        />
        {status !== 'ready' && (
          <div className="player-overlay" role="status">
            {status === 'error' ? labels.error : labels.loading}
          </div>
        )}
      </div>
      <div className="player-help">
        <span>{labels.instructions}</span>
        <p>{game.controls}</p>
      </div>
    </div>
  );
}
