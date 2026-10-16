export default {
  fetch() {
    return new Response('Not found', { status: 404 });
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      const id = message.body?.jobId;
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) {
        message.ack();
        continue;
      }
      try {
        const result = await env.GAME_PROCESSOR.process(id);
        console.log('Game task delivery completed', {
          jobId: id,
          status: result?.status,
        });
        message.ack();
      } catch {
        // A duplicate cannot claim an active job; the cron sweeper refunds jobs
        // interrupted after claim. Never retry a model request in this consumer.
        console.error('Game queue delivery could not be completed.');
        message.retry({ delaySeconds: 10 });
      }
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      env.GAME_PROCESSOR.recover().then((result) => {
        console.log('Game task recovery completed', result);
        return result;
      })
    );
  },
};
