import { gameModelDefaults } from '@/lib/games/model-config';

type Message = { role: 'system' | 'user'; content: string };

/** Shared by game generation and the administrator's JSON connection check. */
export async function requestGameModel(
  configs: Record<string, string>,
  messages: Message[],
  signal: AbortSignal,
  maxTokens = 10000
) {
  signal.throwIfAborted();
  const key = configs.openai_api_key?.trim();
  if (!key) throw new Error('Configure the model API key in AI settings.');
  const model = configs.openai_model?.trim() || gameModelDefaults.openai_model;
  let base: URL;
  try {
    base = new URL(
      configs.openai_base_url?.trim() || gameModelDefaults.openai_base_url
    );
  } catch {
    throw new Error('Configure a valid HTTPS model API endpoint.');
  }
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.protocol !== 'https:' &&
      !(
        process.env.NODE_ENV !== 'production' &&
        base.protocol === 'http:' &&
        ['127.0.0.1', 'localhost'].includes(base.hostname)
      ))
  )
    throw new Error(
      'Configure an HTTPS model API endpoint without credentials or query parameters.'
    );
  const deepseek = base.hostname === 'api.deepseek.com';
  const provider = deepseek ? 'DeepSeek' : 'Model';
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(60_000)]);
  let response: Response;
  try {
    response = await fetch(
      base.toString().replace(/\/+$/, '') + '/chat/completions',
      {
        method: 'POST',
        redirect: 'error',
        signal: requestSignal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          stream: false,
          response_format: { type: 'json_object' },
          max_tokens: maxTokens,
          // DeepSeek defaults to thinking mode. Disable it to reserve this job's
          // output budget and 60-second request deadline for playable game code.
          ...(deepseek ? { thinking: { type: 'disabled' } } : {}),
          messages,
        }),
      }
    );
  } catch {
    if (signal.aborted) signal.throwIfAborted();
    if (requestSignal.aborted)
      throw new Error(`${provider} request timed out after 60 seconds.`);
    throw new Error(
      `${provider} connection failed. Check the API endpoint and try again.`
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    const reasons: Record<number, string> = {
      400: 'rejected the model or request parameters',
      401: 'rejected the API key',
      402: 'account has insufficient balance',
      403: 'denied access to this model',
      404: 'model or API endpoint was not found',
      429: 'rate limit reached; try again later',
    };
    // Never echo provider error bodies: they can contain credentials or input.
    throw new Error(
      `${provider} ${reasons[response.status] || 'request failed'} (${response.status}).`
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error(`${provider} returned no response.`);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    if (Number(response.headers.get('content-length') || 0) > 1_000_000)
      throw new Error('Model response was too large.');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 1_000_000) throw new Error('Model response was too large.');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (signal.aborted) signal.throwIfAborted();
    if (requestSignal.aborted)
      throw new Error(`${provider} request timed out after 60 seconds.`);
    throw error;
  } finally {
    reader.releaseLock();
  }
  let data: any;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new Error(`${provider} returned an invalid API response.`);
  }
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === 'length')
    throw new Error(
      `${provider} output was truncated. Generate a smaller game.`
    );
  if (choice?.finish_reason && choice.finish_reason !== 'stop')
    throw new Error(`${provider} could not complete the response.`);
  const content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim())
    throw new Error(`${provider} returned empty content. Try again.`);
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error(`${provider} did not return valid JSON.`);
  }
  if (!json || typeof json !== 'object' || Array.isArray(json))
    throw new Error(`${provider} must return a JSON object.`);
  return { json, model, provider };
}
