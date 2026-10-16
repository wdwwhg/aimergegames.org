'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Gamepad2 } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import type { GameArtifact } from '@/lib/games/types';

import { GamePlayer, type PlayerLabels } from './game-player';

export function GameLibrary({
  labels,
  playerLabels,
}: {
  labels: Record<string, string>;
  playerLabels: PlayerLabels;
}) {
  const [games, setGames] = useState<GameArtifact[]>([]),
    [credits, setCredits] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<string | null>(null),
    [unauthorized, setUnauthorized] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/games', { cache: 'no-store' });
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      const json = await response.json();
      if (!response.ok || json.code !== 0) throw new Error();
      setGames(json.data.games);
      setCredits(json.data.credits);
    } catch {
      setError(labels.error);
    } finally {
      setLoading(false);
    }
  }, [labels]);
  useEffect(() => {
    void load();
  }, [load]);
  async function remove(id: string) {
    if (!confirm(labels.confirm)) return;
    try {
      const response = await fetch('/api/games/' + id, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || json.code !== 0) throw new Error();
      setGames((items) => items.filter((g) => g.id !== id));
    } catch {
      setError(labels.deleteFailed);
    }
  }
  return (
    <div className="library-content">
      <h1>{labels.title}</h1>
      <p>{labels.description}</p>
      <div className="library-toolbar">
        <span className="credit-pill">
          {credits} {labels.credits}
        </span>
        <Link className="primary-link" href="/create">
          {labels.create}
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {loading ? (
        <p role="status">{labels.loading}</p>
      ) : unauthorized ? (
        <Link className="primary-link" href="/sign-in">
          {labels.signIn}
        </Link>
      ) : error ? (
        <div role="alert">
          {error} <button onClick={load}>{labels.retry}</button>
        </div>
      ) : games.length === 0 ? (
        <div className="empty-library">
          <Gamepad2 size={40} />
          <h2>{labels.empty}</h2>
          <p>{labels.emptyText}</p>
          <Link className="primary-link" href="/examples">
            {labels.explore}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="library-grid">
          {games.map((game) => (
            <article className="saved-game" key={game.id}>
              <h2>{game.title}</h2>
              <p>{game.summary}</p>
              <div className="saved-game-actions">
                <button
                  onClick={() =>
                    setSelected(selected === game.id ? null : game.id)
                  }
                >
                  {labels.play}
                </button>
                <a href={'/api/games/' + game.id + '/download'}>
                  {labels.download}
                </a>
                <button onClick={() => remove(game.id)}>{labels.delete}</button>
              </div>
              {selected === game.id ? (
                <GamePlayer game={game} labels={playerLabels} />
              ) : (
                <img
                  src={game.thumbnail}
                  width="320"
                  height="200"
                  alt={game.title}
                  loading="lazy"
                />
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
