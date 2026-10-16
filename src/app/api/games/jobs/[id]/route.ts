import { getGameJob } from '@/modules/ai-tasks/game-service';
import { findGame } from '@/modules/games/service';
import { gameUser, privateHeaders } from '@/lib/games/api';
import { respData, respErr } from '@/lib/resp';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await gameUser();
  if (!user)
    return respErr('Unauthorized', { status: 401, headers: privateHeaders });
  const { id } = await params;
  const job = await getGameJob(user.id, id);
  if (!job)
    return respErr('Job not found', { status: 404, headers: privateHeaders });
  return respData(
    {
      ...job,
      game: job.status === 'success' ? await findGame(user.id, id) : undefined,
    },
    { headers: privateHeaders }
  );
}
