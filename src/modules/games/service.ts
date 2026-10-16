import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { game } from '@/config/db/schema';
import type { GameArtifact } from '@/lib/games/types';

export function serializeGame(row: any): GameArtifact {
  const input = JSON.parse(row.input);
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    controls: row.controls,
    code: row.code,
    version: row.version,
    thumbnail: row.thumbnail,
    gameA: input.gameA,
    gameB: input.gameB,
    genre: input.genre,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}
export async function listGames(userId: string) {
  const rows = await db()
    .select()
    .from(game)
    .where(and(eq(game.userId, userId), isNull(game.deletedAt)))
    .orderBy(desc(game.createdAt))
    .limit(100);
  return rows.map(serializeGame);
}
export async function findGame(userId: string, id: string) {
  const [row] = await db()
    .select()
    .from(game)
    .where(
      and(eq(game.userId, userId), eq(game.id, id), isNull(game.deletedAt))
    )
    .limit(1);
  return row ? serializeGame(row) : null;
}
export async function deleteGame(userId: string, id: string) {
  return db()
    .update(game)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(game.userId, userId), eq(game.id, id), isNull(game.deletedAt))
    )
    .returning({ id: game.id });
}
