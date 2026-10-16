import { headers } from 'next/headers';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { listAllTickets, type TicketStatus } from '@/modules/tickets/service';
import { respErr, respPage } from '@/lib/resp';

const VALID_STATUSES: TicketStatus[] = ['open', 'replied', 'closed'];

async function checkAdmin() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('Unauthorized');
  const isAdmin = await hasPermission(session.user.id, 'admin.*');
  if (!isAdmin) throw new Error('Forbidden');
  return session;
}

export async function GET(req: Request) {
  try {
    await checkAdmin();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20'))
    );
    const status = searchParams.get('status') as TicketStatus | null;
    const search = searchParams.get('keyword') || undefined;

    const { items, total } = await listAllTickets({
      page,
      pageSize,
      status: status && VALID_STATUSES.includes(status) ? status : undefined,
      search,
    });
    return respPage(items, total);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}
