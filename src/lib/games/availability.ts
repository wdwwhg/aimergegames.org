export function generationAvailable(c: Record<string, string>) {
  return (
    // Cloudflare's queue is connected, but isolated validation and public launch
    // acceptance are still pending. Admin toggles cannot start unverified jobs.
    process.env.DATABASE_PROVIDER !== 'd1' &&
    c.game_generation_enabled === 'true' &&
    c.game_generation_verified === 'true' &&
    !!c.openai_api_key &&
    !!c.openai_model &&
    !!c.openai_base_url
  );
}
export function purchasesAvailable(c: Record<string, string>) {
  return (
    generationAvailable(c) &&
    c.game_purchases_enabled === 'true' &&
    c.game_payments_verified === 'true'
  );
}
