import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

// Static assets are served by the binding; uncached server routes use D1.
export default defineCloudflareConfig({ incrementalCache: kvIncrementalCache });
