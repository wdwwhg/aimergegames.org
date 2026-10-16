export function generationAvailable(c: Record<string, string>) {
  return (
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
