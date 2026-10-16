'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { DataTable, type Column } from '@/components/data-table';
import {
  ImageUploader,
  type ImageUploaderValue,
} from '@/components/image-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type TicketStatus = 'open' | 'replied' | 'closed';

interface TicketRow {
  id: string;
  title: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  latestReply: string | null;
}

interface TicketMessageRow {
  id: string;
  role: 'user' | 'admin';
  content: string;
  attachments: string[];
  createdAt: string;
  userName: string | null;
  userAvatar: string | null;
}

/** Extract uploaded URLs from uploader items; true while any upload is in flight. */
function uploaderState(items: ImageUploaderValue[]) {
  return {
    urls: items
      .filter((i) => i.status === 'uploaded' && i.url)
      .map((i) => i.url!),
    uploading: items.some((i) => i.status === 'uploading'),
  };
}

function AttachmentGrid({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <a
          key={`${url}-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="border-border size-16 rounded-md border object-cover transition-opacity hover:opacity-80"
          />
        </a>
      ))}
    </div>
  );
}

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<TicketStatus, 'default' | 'secondary' | 'outline'> =
  {
    open: 'default',
    replied: 'secondary',
    closed: 'outline',
  };

export default function TicketsPage() {
  const t = useTranslations('settings');
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog
  const [activeTicket, setActiveTicket] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [reply, setReply] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<string[]>([]);
  const [replyUploading, setReplyUploading] = useState(false);
  const [replyUploaderKey, setReplyUploaderKey] = useState(0);
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchRows = useCallback(
    (p: number) => {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set('keyword', debouncedSearch);
      fetch(`/api/tickets?${params}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.code === 0) {
            setRows(res.data.items);
            setTotal(res.data.total);
          }
        });
    },
    [debouncedSearch]
  );

  useEffect(() => {
    fetchRows(page);
  }, [page, fetchRows]);

  async function openDetail(row: TicketRow) {
    const res = await fetch(`/api/tickets/${row.id}`);
    const data = await res.json();
    if (data.code === 0) {
      setActiveTicket(data.data.ticket);
      setMessages(data.data.messages);
      setReplyAttachments([]);
      setReplyUploaderKey((k) => k + 1);
    } else {
      toast.error(data.message || 'Failed');
    }
  }

  async function submitCreate() {
    if (!title.trim() || !content.trim()) {
      toast.error(t('tickets.required'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, attachments }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success(t('tickets.create_success'));
        setCreateOpen(false);
        setTitle('');
        setContent('');
        setAttachments([]);
        setUploaderKey((k) => k + 1);
        setPage(1);
        fetchRows(1);
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch {
      toast.error('Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply() {
    if (!activeTicket || !reply.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/tickets/${activeTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply, attachments: replyAttachments }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setReply('');
        await openDetail(activeTicket);
        fetchRows(page);
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch {
      toast.error('Failed');
    } finally {
      setReplying(false);
    }
  }

  async function closeTicket() {
    if (!activeTicket) return;
    const res = await fetch(`/api/tickets/${activeTicket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    });
    const data = await res.json();
    if (data.code === 0) {
      toast.success(t('tickets.close_success'));
      setActiveTicket(null);
      fetchRows(page);
    } else {
      toast.error(data.message || 'Failed');
    }
  }

  const columns: Column<TicketRow>[] = [
    {
      header: t('tickets.created_col'),
      className: 'w-[160px]',
      cell: (r) => (
        <span className="text-muted-foreground">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: t('tickets.title_col'),
      cell: (r) => (
        <button
          className="text-left font-medium hover:underline"
          onClick={() => openDetail(r)}
        >
          {r.title}
        </button>
      ),
    },
    {
      header: t('tickets.latest_reply_col'),
      cell: (r) => (
        <span className="text-muted-foreground block max-w-[280px] truncate">
          {r.latestReply || '—'}
        </span>
      ),
    },
    {
      header: t('tickets.updated_col'),
      className: 'w-[160px]',
      cell: (r) => (
        <span className="text-muted-foreground">
          {new Date(r.updatedAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: t('tickets.status_col'),
      className: 'w-[120px]',
      cell: (r) => (
        <Badge variant={STATUS_BADGE[r.status]}>
          {t(`tickets.status_${r.status}`)}
        </Badge>
      ),
    },
    {
      header: t('tickets.actions_col'),
      className: 'w-[80px]',
      cell: (r) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => openDetail(r)}
        >
          <MessageSquare className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('tickets.title')}</h1>
          <p className="text-muted-foreground">{t('tickets.description')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          {t('tickets.create_button')}
        </Button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(r) => r.id}
            emptyText={t('tickets.empty')}
            search={search}
            onSearchChange={setSearch}
            onRefresh={() => fetchRows(page)}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tickets.create_title')}</DialogTitle>
            <DialogDescription>
              {t('tickets.create_description')}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitCreate();
            }}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="ticket-title">{t('tickets.title_label')}</Label>
                <Input
                  id="ticket-title"
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('tickets.title_placeholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-content">
                  {t('tickets.content_label')}
                </Label>
                <Textarea
                  id="ticket-content"
                  value={content}
                  maxLength={5000}
                  rows={6}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('tickets.content_placeholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('tickets.attachments_label')}</Label>
                <ImageUploader
                  key={uploaderKey}
                  allowMultiple
                  maxImages={9}
                  onChange={(items) => {
                    const { urls, uploading: busy } = uploaderState(items);
                    setAttachments(urls);
                    setUploading(busy);
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                {t('tickets.cancel')}
              </Button>
              <Button type="submit" disabled={submitting || uploading}>
                {submitting
                  ? t('tickets.creating')
                  : t('tickets.create_submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!activeTicket}
        onOpenChange={(v) => !v && setActiveTicket(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeTicket?.title}
              {activeTicket && (
                <Badge variant={STATUS_BADGE[activeTicket.status]}>
                  {t(`tickets.status_${activeTicket.status}`)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[50vh] space-y-3 overflow-y-auto py-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'rounded-lg p-3 text-sm',
                  m.role === 'admin' ? 'bg-primary/10 mr-8' : 'bg-muted ml-8'
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    {m.role === 'user' && (
                      <Avatar className="size-5">
                        <AvatarImage src={m.userAvatar || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(m.userName || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {m.role === 'admin'
                      ? t('tickets.support_team')
                      : m.userName || t('tickets.you')}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <AttachmentGrid urls={m.attachments} />
              </div>
            ))}
          </div>

          {activeTicket?.status !== 'closed' ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitReply();
              }}
            >
              <Textarea
                value={reply}
                maxLength={5000}
                rows={3}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t('tickets.reply_placeholder')}
              />
              <ImageUploader
                key={replyUploaderKey}
                allowMultiple
                maxImages={9}
                onChange={(items) => {
                  const { urls, uploading: busy } = uploaderState(items);
                  setReplyAttachments(urls);
                  setReplyUploading(busy);
                }}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeTicket}>
                  {t('tickets.close_ticket')}
                </Button>
                <Button
                  type="submit"
                  disabled={replying || replyUploading || !reply.trim()}
                >
                  {replying ? t('tickets.replying') : t('tickets.reply_submit')}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t('tickets.closed_notice')}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
