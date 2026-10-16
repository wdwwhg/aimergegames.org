'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { DataTable, type Column } from '@/components/data-table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ORDER_STATUSES = [
  'pending',
  'created',
  'paid',
  'failed',
  'deleted',
] as const;

interface Order {
  id: string;
  orderNo: string;
  userId: string;
  userEmail: string | null;
  status: string;
  amount: number;
  currency: string;
  paymentType: string | null;
  paymentProvider: string;
  productId: string | null;
  productName: string | null;
  description: string | null;
  createdAt: string;
  paidAt: string | null;
}

const PAGE_SIZE = 20;

const TABS = ['all', 'subscription', 'one_time'] as const;
type Tab = (typeof TABS)[number];

interface EditForm {
  status: string;
  productId: string;
  productName: string;
  description: string;
}

export default function PaymentsPage() {
  const t = useTranslations('admin');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Edit dialog
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [form, setForm] = useState<EditForm>({
    status: '',
    productId: '',
    productName: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchOrders = useCallback(
    (p: number) => {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(PAGE_SIZE),
      });
      if (tab === 'subscription') params.set('paymentType', 'subscription');
      if (tab === 'one_time') params.set('paymentType', 'one_time');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      fetch(`/api/admin/orders?${params}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.code === 0) {
            setOrders(res.data.items);
            setTotal(res.data.total);
          }
        });
    },
    [tab, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    setPage(1);
    fetchOrders(1);
  }, [tab, statusFilter, debouncedSearch, fetchOrders]);

  useEffect(() => {
    fetchOrders(page);
  }, [page, fetchOrders]);

  function formatAmount(amount: number, currency: string) {
    const value = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  }

  const statusVariant = (s: string) => {
    if (s === 'paid') return 'default';
    if (s === 'failed') return 'destructive';
    return 'secondary';
  };

  function openEdit(o: Order) {
    setEditingOrder(o);
    setForm({
      status: o.status,
      productId: o.productId ?? '',
      productName: o.productName ?? '',
      description: o.description ?? '',
    });
  }

  async function submitEdit() {
    if (!editingOrder) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNo: editingOrder.orderNo,
          status: form.status,
          productId: form.productId || null,
          productName: form.productName || null,
          description: form.description || null,
        }),
      });
      const data = await res.json();
      if (data.code !== 0) throw new Error(data.message);
      toast.success(t('payments.update_success'));
      setEditingOrder(null);
      fetchOrders(page);
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<Order>[] = [
    {
      header: t('payments.order_no'),
      cell: (o) => <span className="font-mono text-xs">{o.orderNo}</span>,
    },
    {
      header: t('payments.user'),
      cell: (o) => <span className="text-sm">{o.userEmail || o.userId}</span>,
    },
    {
      header: t('payments.amount'),
      cell: (o) => (
        <span className="font-medium">
          {formatAmount(o.amount, o.currency)}
        </span>
      ),
    },
    {
      header: t('payments.status'),
      cell: (o) => (
        <Badge variant={statusVariant(o.status)}>
          {t(`payments.status_${o.status}` as any)}
        </Badge>
      ),
    },
    {
      header: t('payments.type'),
      cell: (o) => o.paymentType || '—',
    },
    {
      header: t('payments.provider'),
      cell: (o) => o.paymentProvider,
    },
    {
      header: t('payments.created_at'),
      cell: (o) => (
        <span className="text-muted-foreground text-sm">
          {formatDateTime(o.createdAt)}
        </span>
      ),
    },
    {
      header: '',
      className: 'w-[60px]',
      cell: (o) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => openEdit(o)}
        >
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t('payments.title')}</h1>
        <p className="text-muted-foreground">{t('payments.description')}</p>
      </div>

      <div className="border-border flex gap-1 overflow-x-auto overflow-y-hidden border-b">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === tb
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {t(`payments.tab_${tb}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={orders}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(o) => o.id}
            emptyText={t('payments.no_payments')}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('payments.search_placeholder')}
            toolbar={
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v ?? 'all')}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('payments.tab_all')}</SelectItem>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`payments.status_${s}` as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            onRefresh={() => fetchOrders(page)}
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingOrder}
        onOpenChange={(v) => !v && setEditingOrder(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('payments.edit_title')}</DialogTitle>
            <DialogDescription>
              {t('payments.edit_description')}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitEdit();
            }}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>{t('payments.order_no')}</Label>
                <Input value={editingOrder?.orderNo ?? ''} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>{t('payments.status_label')}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v ?? '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`payments.status_${s}` as any)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('payments.product_id_label')}</Label>
                <Input
                  value={form.productId}
                  onChange={(e) =>
                    setForm({ ...form, productId: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('payments.product_name_label')}</Label>
                <Input
                  value={form.productName}
                  onChange={(e) =>
                    setForm({ ...form, productName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('payments.product_description_label')}</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingOrder(null)}
              >
                {t('payments.cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t('payments.saving') : t('payments.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
