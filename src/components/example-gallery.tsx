'use client';

import { useState } from 'react';
import { ArrowUpRight, Play, X } from 'lucide-react';

import { exampleGames, type ExampleGame } from '@/lib/games/examples';
import { GamePlayer, type PlayerLabels } from '@/components/game-player';

export function ExampleGallery({
  labels,
  playerLabels,
}: {
  labels: Record<string, string>;
  playerLabels: PlayerLabels;
}) {
  const [selected, setSelected] = useState<ExampleGame | null>(null);
  return (
    <>
      <div className="example-grid">
        {exampleGames.map((game, i) => (
          <button
            className={`example-card example-${game.accent}`}
            key={game.id}
            onClick={() => setSelected(game)}
            aria-label={`${labels.play}: ${game.title}`}
          >
            <div className="example-art">
              <img
                src={game.image}
                width="640"
                height="400"
                alt={`Original geometric artwork for ${game.title}`}
                loading="lazy"
              />
              <span className="example-number">0{i + 1}</span>
              <span className="play-circle">
                <Play size={20} fill="currentColor" />
              </span>
              <span className="premade-pill">{labels.premade}</span>
            </div>
            <div className="example-detail">
              <span>{game.category}</span>
              <div>
                <h3>{game.title}</h3>
                <ArrowUpRight size={21} />
              </div>
              <p>{game.pair}</p>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="game-dialog-backdrop" onClick={() => setSelected(null)}>
          <section
            className="game-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSelected(null);
            }}
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">{labels.premade}</span>
                <h2>{selected.title}</h2>
              </div>
              <button
                autoFocus
                onClick={() => setSelected(null)}
                aria-label={playerLabels.close}
              >
                <X size={22} />
              </button>
            </div>
            <p>{selected.summary}</p>
            <GamePlayer game={selected} labels={playerLabels} />
          </section>
        </div>
      )}
    </>
  );
}
