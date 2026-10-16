import { launch } from '@cloudflare/playwright';

import { checkGameInBrowser } from '../scripts/validator/browser-check.mjs';
import { validatorHandler } from './validator-handler.mjs';

export default { fetch: validatorHandler(launch, checkGameInBrowser) };
