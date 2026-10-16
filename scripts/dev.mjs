import { spawn } from 'node:child_process';

const tasks = [
  ['node_modules/next/dist/bin/next', 'dev'],
  ['scripts/game-runner.mjs'],
  ['--env-file=.env.development', '--import', 'tsx', 'scripts/game-worker.ts'],
];
const children = tasks.map((args) =>
  spawn(process.execPath, args, { stdio: 'inherit', env: process.env })
);
function stop() {
  for (const child of children) child.kill();
}
process.on('SIGINT', () => {
  stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stop();
  process.exit(0);
});
for (const child of children)
  child.on('exit', (code) => {
    if (code) {
      stop();
      process.exit(code);
    }
  });
