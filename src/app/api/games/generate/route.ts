import { enqueueGame } from '@/modules/ai-tasks/game-service';
import { getAllConfigs } from '@/modules/config/service';
import { gameUser, privateHeaders } from '@/lib/games/api';
import { generationAvailable } from '@/lib/games/availability';
import { generationInput } from '@/lib/games/types';
import { respData, respErr } from '@/lib/resp';

export async function POST(req: Request) {
  const user = await gameUser();
  if (!user)
    return respErr('Sign in to create a game.', {
      status: 401,
      headers: privateHeaders,
    });
  const configs = await getAllConfigs();
  if (!generationAvailable(configs))
    return respErr('AI generation is not open yet.', {
      status: 503,
      headers: privateHeaders,
    });
  if (Number(req.headers.get('content-length') || 0) > 8192)
    return respErr('Request is too large.', { status: 413 });
  try {
    const text = await req.text();
    if (text.length > 8192)
      return respErr('Request is too large.', { status: 413 });
    const parsed = generationInput.safeParse(JSON.parse(text));
    if (!parsed.success)
      return respErr(
        'Choose two different games and a valid generation request.',
        { status: 400 }
      );
    const job = await enqueueGame(user.id, parsed.data);
    return respData(
      { id: job.id, status: job.status },
      { status: 202, headers: privateHeaders }
    );
  } catch (e) {
    return respErr(
      e instanceof Error && /credit|already generating/.test(e.message)
        ? e.message
        : 'Could not start this generation. Please try again.',
      { status: 409, headers: privateHeaders }
    );
  }
}
