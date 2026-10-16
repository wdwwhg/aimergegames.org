import { headers } from 'next/headers';

import { getAuth } from '@/core/auth';
import {
  addMessage,
  getTicketById,
  getTicketMessages,
  sanitizeAttachments,
  updateTicketStatus,
} from '@/modules/tickets/service';
import { respData, respErr, respOk } from '@/lib/resp';

async function getOwnedTicket(id: string) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('Unauthorized');
  const row = await getTicketById(id);
  if (!row || row.userId !== session.user.id)
    throw new Error('Ticket not found');
  return { session, ticket: row };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { ticket } = await getOwnedTicket(id);
    const messages = await getTicketMessages(id);
    return respData({ ticket, messages });
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

// User reply — re-opens the ticket for admin attention
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, ticket } = await getOwnedTicket(id);
    if (ticket.status === 'closed') return respErr('Ticket is closed');

    const body = await req.json().catch(() => ({}));
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) return respErr('Content is required');
    if (content.length > 5000) return respErr('Content is too long');

    const attachments = sanitizeAttachments(body.attachments);
    if (attachments === null) return respErr('Invalid attachments');

    const message = await addMessage({
      ticketId: id,
      userId: session.user.id,
      role: 'user',
      content,
      attachments,
    });
    return respData(message);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

// User closes their own ticket
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getOwnedTicket(id);

    const body = await req.json().catch(() => ({}));
    if (body.status !== 'closed') return respErr('Invalid status');

    await updateTicketStatus(id, 'closed');
    return respOk();
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}
