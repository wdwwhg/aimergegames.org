import { deleteGame, findGame } from '@/modules/games/service';
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
  const game = await findGame(user.id, id);
  return game
    ? respData(game, { headers: privateHeaders })
    : respErr('Game not found', { status: 404, headers: privateHeaders });
}
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await gameUser();
  if (!user)
    return respErr('Unauthorized', { status: 401, headers: privateHeaders });
  const { id } = await params;
  const rows = await deleteGame(user.id, id);
  return rows.length
    ? respData({ id }, { headers: privateHeaders })
    : respErr('Game not found', { status: 404, headers: privateHeaders });
}
