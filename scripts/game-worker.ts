import { envConfigs } from '../src/config';
import { generateGame } from '../src/core/ai/game-generator';
import { runGamePipeline } from '../src/core/ai/game-pipeline';
import { generationAvailable } from '../src/lib/games/availability';
import type { GameOutput } from '../src/lib/games/types';
import {
  claimGameJob,
  completeGameJob,
  expireGameJobs,
  failGameJob,
  setGamePhase,
} from '../src/modules/ai-tasks/game-service';
import { getAllConfigs, invalidateCache } from '../src/modules/config/service';

let running = true;
process.on('SIGINT', () => {
  running = false;
});
process.on('SIGTERM', () => {
  running = false;
});
async function validate(output: GameOutput, signal: AbortSignal) {
  const response = await fetch(envConfigs.game_validator_url + '/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
    body: JSON.stringify({ code: output.code }),
  });
  if (!response.ok)
    throw new Error('The isolated game validator is unavailable.');
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || 'Game startup check failed.');
  if (
    typeof result.thumbnail !== 'string' ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(result.thumbnail) ||
    result.thumbnail.length > 1_500_000
  )
    throw new Error('The game validator returned an invalid preview.');
  return result.thumbnail;
}
async function main() {
  console.log(
    'Game worker ready. Generation stays closed until configured and verified.'
  );
  while (running) {
    try {
      await expireGameJobs();
      invalidateCache();
      const configs = await getAllConfigs();
      if (generationAvailable(configs)) {
        const job = await claimGameJob();
        if (job) {
          const signal = AbortSignal.timeout(
            Math.max(1, new Date(job.deadlineAt).getTime() - Date.now())
          );
          try {
            const result = await runGamePipeline({
              signal,
              generate: (previous) =>
                generateGame(configs, JSON.parse(job.input), signal, previous),
              validate: (output) => validate(output, signal),
              phase: (phase) => setGamePhase(job.id, job.leaseToken, phase),
            });
            await completeGameJob(
              job.id,
              job.leaseToken,
              result.output,
              result.thumbnail
            );
          } catch (error) {
            await failGameJob(
              job.id,
              error instanceof Error
                ? error.message
                : 'Generation failed. Your credit was returned.',
              job.leaseToken
            );
          }
          continue;
        }
      }
    } catch (error) {
      console.error(
        'Game worker could not process the queue:',
        error instanceof Error ? error.message : 'unknown error'
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}
void main();
