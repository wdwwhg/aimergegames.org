import { generateGame } from '../src/core/ai/game-generator';
import { runGamePipeline } from '../src/core/ai/game-pipeline';
import {
  dispatchGameJob,
  getGameCloudBindings,
} from '../src/core/ai/game-queue';
import {
  gameOutput,
  generationInput,
  type GameOutput,
} from '../src/lib/games/types';
import {
  claimD1GameJob,
  pendingD1GameJobs,
} from '../src/modules/ai-tasks/game-d1';
import {
  completeGameJob,
  expireGameJobs,
  failGameJob,
  setGamePhase,
} from '../src/modules/ai-tasks/game-service';
import { getAllConfigs, invalidateCache } from '../src/modules/config/service';

export async function processCloudGameJob(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return { status: 'ignored' };
  await expireGameJobs();
  const job = await claimD1GameJob(id);
  if (!job) return { status: 'already-claimed-or-expired' };
  const deadline = AbortSignal.timeout(
    Math.max(1, job.deadlineAt!.getTime() - Date.now())
  );
  try {
    const validator = getGameCloudBindings().GAME_VALIDATOR;
    if (!validator)
      throw new Error(
        'The isolated game validator is not connected. Your credit was returned.'
      );
    invalidateCache();
    const configs = await getAllConfigs();
    const input = generationInput.parse(JSON.parse(job.input));
    const result = await runGamePipeline({
      signal: deadline,
      generate: (previous) => generateGame(configs, input, deadline, previous),
      phase: (phase) => setGamePhase(id, job.leaseToken!, phase),
      validate: async (output: GameOutput) => {
        gameOutput.parse(output);
        const response = await validator.fetch(
          new Request('https://game-validator/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: output.code }),
            signal: AbortSignal.any([deadline, AbortSignal.timeout(25000)]),
          })
        );
        if (!response.ok)
          throw new Error('The isolated game validator is unavailable.');
        // Bound response size before parsing a thumbnail supplied by the validator.
        const reader = response.body?.getReader();
        if (!reader)
          throw new Error('The isolated game validator returned no result.');
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 1600000)
              throw new Error('The validation preview was too large.');
            chunks.push(value);
          }
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
        const checked = JSON.parse(Buffer.concat(chunks).toString());
        if (!checked.ok)
          throw new Error('The game did not pass its isolated startup checks.');
        if (
          typeof checked.thumbnail !== 'string' ||
          !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(checked.thumbnail) ||
          checked.thumbnail.length > 1500000
        )
          throw new Error(
            'The isolated validator returned an invalid preview.'
          );
        return checked.thumbnail as string;
      },
    });
    await completeGameJob(id, job.leaseToken!, result.output, result.thumbnail);
    return { status: 'processed' };
  } catch (error) {
    await failGameJob(
      id,
      deadline.aborted
        ? 'Generation timed out. Your credit was returned.'
        : error instanceof Error
          ? error.message
          : 'Generation failed. Your credit was returned.',
      job.leaseToken!
    );
    return { status: 'failed-and-refunded' };
  }
}

export async function recoverCloudGameJobs() {
  const expired = await expireGameJobs();
  const ids = await pendingD1GameJobs();
  for (const id of ids) await dispatchGameJob(id);
  return { expired, requeued: ids.length };
}
