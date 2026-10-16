'use client';

import { useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';

import { exampleGames } from '@/lib/games/examples';

import { GamePlayer, type PlayerLabels } from './game-player';

export function HeroPreview({
  labels,
  playerLabels,
}: {
  labels: Record<string, string>;
  playerLabels: PlayerLabels;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="hero-preview">
      {playing ? (
        <GamePlayer game={exampleGames[0]} labels={playerLabels} />
      ) : (
        <>
          <div className="preview-illustration">
            <img
              src="/games/moss-knight.svg"
              width="640"
              height="400"
              alt="Moss Knight: an original geometric explorer in a green world"
              fetchPriority="high"
            />
            <span className="preview-label">
              <i className="live-dot" />
              {labels.previewBadge}
            </span>
            <button
              className="preview-play"
              onClick={() => setPlaying(true)}
              aria-label={labels.play}
            >
              <Play size={24} fill="currentColor" />
            </button>
            <span className="preview-caption">
              MOSS KNIGHT <span>01 / 03</span>
            </span>
          </div>
          <div className="preview-text">
            <div>
              <h3>{labels.preview}</h3>
              <p>{labels.previewSub}</p>
            </div>
            <button onClick={() => setPlaying(true)} aria-label={labels.play}>
              <ArrowUpRight size={24} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
