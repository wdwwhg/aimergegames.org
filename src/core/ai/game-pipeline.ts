import type { GameOutput } from '@/lib/games/types';

export async function runGamePipeline(hooks: {
  signal: AbortSignal;
  generate: (previous?: {
    output?: GameOutput;
    error: string;
  }) => Promise<GameOutput>;
  validate: (output: GameOutput) => Promise<string>;
  phase: (phase: 'validating' | 'repairing') => Promise<void>;
}) {
  let output: GameOutput | undefined,
    lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    hooks.signal.throwIfAborted();
    try {
      if (attempt) await hooks.phase('repairing');
      output = await hooks.generate(
        attempt ? { output, error: lastError } : undefined
      );
      hooks.signal.throwIfAborted();
      await hooks.phase('validating');
      const thumbnail = await hooks.validate(output);
      hooks.signal.throwIfAborted();
      return { output, thumbnail };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : 'Game validation failed.';
      if (hooks.signal.aborted) throw error;
    }
  }
  throw new Error(lastError);
}
