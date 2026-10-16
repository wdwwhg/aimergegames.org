import { getCloudflareContext } from '@opennextjs/cloudflare';

export type GameQueue = {
  send(
    body: { jobId: string },
    options?: { contentType: 'json' }
  ): Promise<void>;
};
export function getGameCloudBindings() {
  return getCloudflareContext().env as unknown as {
    GAME_TASK_QUEUE?: GameQueue;
    GAME_VALIDATOR?: { fetch(request: Request): Promise<Response> };
  };
}
export async function dispatchGameJob(id: string) {
  const queue = getGameCloudBindings().GAME_TASK_QUEUE;
  if (!queue) throw new Error('The generation task queue is unavailable.');
  await queue.send({ jobId: id }, { contentType: 'json' });
}
