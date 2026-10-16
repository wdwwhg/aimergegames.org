import { getBalance } from '@/modules/credits/service';
import { listGames } from '@/modules/games/service';
import { gameUser, privateHeaders } from '@/lib/games/api';
import { respData, respErr } from '@/lib/resp';

export async function GET() {
  const user = await gameUser();
  if (!user)
    return respErr('Unauthorized', { status: 401, headers: privateHeaders });
  return respData(
    { games: await listGames(user.id), credits: await getBalance(user.id) },
    { headers: privateHeaders }
  );
}
