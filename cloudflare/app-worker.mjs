import { WorkerEntrypoint } from 'cloudflare:workers';

import { runWithCloudflareRequestContext } from '../.open-next/cloudflare/init.js';
import nextWorker from '../.open-next/worker.js';

export * from '../.open-next/worker.js';
export default nextWorker;

// Named RPC entrypoint: no HTTP route exposes these methods. Only the trusted
// queue consumer's service binding can enter this orchestration boundary.
export class GameTaskEntrypoint extends WorkerEntrypoint {
  async process(id) {
    return runWithCloudflareRequestContext(
      new Request('https://aimergegames.org/__internal/game-task'),
      this.env,
      this.ctx,
      async () => (await import('./process-game')).processCloudGameJob(id)
    );
  }
  async recover() {
    return runWithCloudflareRequestContext(
      new Request('https://aimergegames.org/__internal/game-task'),
      this.env,
      this.ctx,
      async () => (await import('./process-game')).recoverCloudGameJobs()
    );
  }
}
