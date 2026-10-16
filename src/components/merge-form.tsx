'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Plus, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import type { GameArtifact } from '@/lib/games/types';
import { GamePlayer, type PlayerLabels } from '@/components/game-player';

type Labels = Record<string, string>;
const suggestions = [
  'Minecraft',
  'Elden Ring',
  'Super Mario',
  'Portal',
  'Stardew Valley',
  'Vampire Survivors',
  'Terraria',
  'Hollow Knight',
];
export function MergeForm({
  labels,
  playerLabels,
  enabled = false,
}: {
  labels: Labels;
  playerLabels: PlayerLabels;
  enabled?: boolean;
}) {
  const [a, setA] = useState('Minecraft'),
    [b, setB] = useState('Elden Ring'),
    [description, setDescription] = useState(''),
    [genre, setGenre] = useState('auto');
  const [error, setError] = useState(''),
    [job, setJob] = useState<string | null>(null),
    [status, setStatus] = useState(''),
    [game, setGame] = useState<GameArtifact | null>(null);
  const key = useRef('');
  const submitting = useRef(false);
  useEffect(() => {
    const saved = localStorage.getItem('merge-active-job');
    if (saved) setJob(saved);
  }, []);
  useEffect(() => {
    if (!job) return;
    let canceled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/games/jobs/${job}`, {
          cache: 'no-store',
        });
        const json = await response.json();
        if (canceled) return;
        if (!response.ok || json.code !== 0) throw new Error(json.message);
        setStatus(json.data.status);
        if (json.data.status === 'success') {
          setGame(json.data.game);
          localStorage.removeItem('merge-active-job');
          setJob(null);
          return;
        }
        if (json.data.status === 'failed') {
          setError(labels.refunded);
          localStorage.removeItem('merge-active-job');
          setJob(null);
          return;
        }
        timer = setTimeout(poll, 2000);
      } catch {
        if (!canceled) {
          setError(labels.failed);
          timer = setTimeout(poll, 5000);
        }
      }
    }
    void poll();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [job, labels]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!enabled || submitting.current || job) return;
    if (
      a.trim().length < 2 ||
      b.trim().length < 2 ||
      a.trim().toLowerCase() === b.trim().toLowerCase()
    ) {
      setError(labels.invalid);
      return;
    }
    submitting.current = true;
    setError('');
    setStatus('pending');
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameA: a,
          gameB: b,
          description,
          genre,
          idempotencyKey: key.current,
        }),
      });
      const json = await response.json();
      if (!response.ok || json.code !== 0) {
        if (response.status === 401) {
          setError(labels.signIn);
          return;
        }
        key.current = '';
        throw new Error(json.message);
      }
      setJob(json.data.id);
      localStorage.setItem('merge-active-job', json.data.id);
      key.current = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : labels.failed);
    } finally {
      submitting.current = false;
    }
  }
  return (
    <>
      <form className="merge-form" onSubmit={submit}>
        <datalist id="game-suggestions">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <div className="pair-inputs">
          <label>
            <span>
              <i className="input-dot dot-green" />
              {labels.first}
            </span>
            <input
              required
              minLength={2}
              maxLength={80}
              list="game-suggestions"
              value={a}
              onChange={(e) => {
                setA(e.target.value);
                key.current = '';
              }}
              placeholder={labels.placeholderA}
            />
          </label>
          <span className="pair-plus">
            <Plus size={17} />
          </span>
          <label>
            <span>
              <i className="input-dot dot-purple" />
              {labels.second}
            </span>
            <input
              required
              minLength={2}
              maxLength={80}
              list="game-suggestions"
              value={b}
              onChange={(e) => {
                setB(e.target.value);
                key.current = '';
              }}
              placeholder={labels.placeholderB}
            />
          </label>
        </div>
        <label className="idea-label">
          <span>
            {labels.idea}
            <Sparkles size={13} />
          </span>
          <textarea
            rows={3}
            maxLength={1200}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              key.current = '';
            }}
            placeholder={labels.ideaPlaceholder}
          />
        </label>
        <label className="style-label">
          <span>{labels.style}</span>
          <div>
            <select
              value={genre}
              onChange={(e) => {
                setGenre(e.target.value);
                key.current = '';
              }}
            >
              {['auto', 'platformer', 'action', 'survival'].map((v) => (
                <option key={v} value={v}>
                  {labels[v]}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </label>
        <button
          className="merge-submit"
          type="submit"
          disabled={!enabled || !!job}
        >
          <Sparkles size={17} />
          {job
            ? labels[status] || labels.loading
            : enabled
              ? labels.button
              : labels.closed}
          <ArrowRight size={17} />
        </button>
        <p className="form-note">{enabled ? labels.cost : labels.closedNote}</p>
        {job && (
          <div className="task-progress" role="status">
            <span className="live-dot" />
            {labels[status] || labels.loading}
            <small>{labels.resume}</small>
          </div>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
            {error === labels.signIn && <Link href="/sign-in"> →</Link>}
          </div>
        )}
        <div className="combination-list">
          <span>{labels.try}</span>
          <div>
            {[
              ['Super Mario', 'Portal'],
              ['Stardew Valley', 'Vampire Survivors'],
            ].map((pair) => (
              <button
                type="button"
                key={pair[0]}
                onClick={() => {
                  setA(pair[0]);
                  setB(pair[1]);
                  key.current = '';
                }}
              >
                {pair[0]} <span>×</span> {pair[1]}
              </button>
            ))}
          </div>
        </div>
      </form>
      {game && (
        <div className="generated-result">
          <p className="success-note">
            {labels.success} <Link href="/dashboard/games">↗</Link>
          </p>
          <GamePlayer game={game} labels={playerLabels} />
        </div>
      )}
    </>
  );
}
