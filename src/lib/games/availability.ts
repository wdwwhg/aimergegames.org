export function generationAvailable(c: Record<string, string>) {
  return (
    // Cloudflare hosts the preview release. The durable generator and isolated
    // validator are not deployed there, so admin toggles cannot start paid jobs.
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
