import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('data', { recursive: true });
if (!existsSync('.env.development')) {
  let env = readFileSync('.env.example', 'utf8')
    .replace(
      'NEXT_PUBLIC_APP_NAME=My App',
      'NEXT_PUBLIC_APP_NAME="AI Merge Games"'
    )
    .replace(
      'NEXT_PUBLIC_APP_DESCRIPTION=Ship your SaaS faster',
      'NEXT_PUBLIC_APP_DESCRIPTION="Create original playable 2D game mashups"'
    )
    .replace('NEXT_PUBLIC_APP_LOGO=/logo.png', 'NEXT_PUBLIC_APP_LOGO=/logo.svg')
    .replace(
      /^AUTH_SECRET=$/m,
      'AUTH_SECRET=' + randomBytes(32).toString('hex')
    )
    .replace(
      /^CONFIG_ENCRYPTION_KEY=$/m,
      'CONFIG_ENCRYPTION_KEY=' + randomBytes(32).toString('hex')
    );
  writeFileSync('.env.development', env);
  console.log(
    'Created local development configuration. No provider keys were added.'
  );
} else console.log('Preserved existing development configuration.');
