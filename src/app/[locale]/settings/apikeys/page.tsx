'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { DataTable, type Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApiKey {
  id: string;
  keyPrefix: string;
  key: string | null;
  title: string;
  lastUsedAt: string | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function ApiKeysPage() {
  const t = useTranslations();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchKeys = useCallback((p: number, s: string) => {
    const params = new URLSearchParams({
      page: String(p),
      pageSize: String(PAGE_SIZE),
    });
    if (s) params.set('search', s);
    fetch(`/api/apikeys?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.code === 0) {
          setKeys(res.data.items);
          setTotal(res.data.total);
        }
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchKeys(page, search), 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchKeys]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newKeyName }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success(t('settings.apikeys.created'));
        setOpen(false);
        setNewKeyName('');
        setCopied(false);
        setCreatedKey(data.data.key);
        fetchKeys(page, search);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error(t('settings.apikeys.failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      toast.success(t('settings.apikeys.key_copied'));
    } catch {
      toast.error(t('settings.apikeys.copy_failed'));
    }
  }

  async function handleCopyCreatedKey() {
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      toast.success(t('settings.apikeys.key_copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('settings.apikeys.copy_failed'));
    }
  }

  async function handleDelete() {
    if (!keyToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/apikeys?id=${keyToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success(t('settings.apikeys.deleted'));
        setKeyToDelete(null);
        fetchKeys(page, search);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error(t('settings.apikeys.delete_failed'));
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<ApiKey>[] = [
    {
      header: t('settings.apikeys.name_col'),
      cell: (k) => <span className="font-medium">{k.title}</span>,
    },
    {
      header: t('settings.apikeys.key_col'),
      cell: (k) => <span className="font-mono text-xs">{k.keyPrefix}…</span>,
    },
    {
      header: t('settings.apikeys.created_col'),
      cell: (k) => (
        <span className="text-muted-foreground text-xs">
          {new Date(k.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: t('settings.apikeys.last_used_col'),
      cell: (k) => (
        <span className="text-muted-foreground text-xs">
          {k.lastUsedAt
            ? new Date(k.lastUsedAt).toLocaleString()
            : t('settings.apikeys.never_used')}
        </span>
      ),
    },
    {
      header: t('settings.apikeys.actions_col'),
      className: 'w-[100px]',
      cell: (k) => (
        <div className="flex gap-1">
          {k.key && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleCopyKey(k.key!)}
            >
              <Copy className="size-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setKeyToDelete(k)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('settings.apikeys.title')}</h1>
          <p className="text-muted-foreground">
            {t('settings.apikeys.description')}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors">
            <Plus className="size-4" />
            {t('settings.apikeys.create_key')}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('settings.apikeys.create_title')}</DialogTitle>
              <DialogDescription>
                {t('settings.apikeys.create_description')}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <div className="space-y-2 py-4">
                <Label htmlFor="key-name">
                  {t('settings.apikeys.key_name')}
                </Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t('settings.apikeys.key_name_placeholder')}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t('settings.apikeys.cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? t('settings.apikeys.creating')
                    : t('settings.apikeys.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={!!createdKey}
        onOpenChange={(v) => {
          if (!v) setCreatedKey('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.apikeys.created_title')}</DialogTitle>
            <DialogDescription>
              {t('settings.apikeys.created_warning')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-4">
            <Input
              readOnly
              value={createdKey}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleCopyCreatedKey}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey('')}>
              {t('settings.apikeys.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!keyToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen && !deleting) setKeyToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.apikeys.delete_title')}</DialogTitle>
            <DialogDescription>
              {t('settings.apikeys.delete_description', {
                name: keyToDelete?.title ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setKeyToDelete(null)}
            >
              {t('settings.apikeys.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting
                ? t('settings.apikeys.deleting')
                : t('settings.apikeys.confirm_delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={keys}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(k) => k.id}
            emptyText={t('settings.apikeys.no_keys')}
            search={search}
            onSearchChange={setSearch}
            onRefresh={() => fetchKeys(page, search)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
