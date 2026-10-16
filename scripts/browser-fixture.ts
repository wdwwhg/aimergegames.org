// Only seeds a disposable local QA account. Never used by the application.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

import { envConfigs } from '../src/config';
import { game, user } from '../src/config/db/schema';
import { db } from '../src/core/db';
import { exampleGames } from '../src/lib/games/examples';

async function main() {
  if (
    process.env.NODE_ENV === 'production' ||
    envConfigs.database_url !== 'file:data/local.db'
  )
    throw new Error('QA fixtures are local-development only.');
  const id = process.argv[2];
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(id || ''))
    throw new Error('Invalid QA user');
  const [owner] = await db()
    .select()
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  if (
    !owner?.email.startsWith('browser-qa-') ||
    !owner.email.endsWith('@example.test')
  )
    throw new Error('Only a QA account can receive this fixture.');
  const item = exampleGames[0],
    gameId = randomUUID();
  await db()
    .insert(game)
    .values({
      id: gameId,
      jobId: randomUUID(),
      userId: id,
      title: 'QA Moss Knight',
      summary: item.summary,
      controls: item.controls,
      code: item.code,
      input: JSON.stringify({
        gameA: item.gameA,
        gameB: item.gameB,
        genre: 'action',
      }),
      thumbnail: '/games/moss-knight.svg',
    });
  console.log('QA_GAME_ID=' + gameId);
}
void main();
