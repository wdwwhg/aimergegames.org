'use client';

import { useState } from 'react';
import { LifeBuoy, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { currentPathWithQuery } from '@/lib/redirect';
import { cn } from '@/lib/utils';
import { ImageUploader } from '@/components/image-uploader';
import { Button, buttonVariants } from '@/components/ui/button';
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

/**
 * Floating support button (bottom-right) that opens a quick ticket form.
 * Drop into any page or layout: <SupportWidget />
 *
 * Requires login — unauthenticated users get a sign-in prompt instead.
 */
export function SupportWidget() {
  const t = useTranslations('common');
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim() || !content.trim()) {
      toast.error(t('support.required'));
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
        toast.success(t('support.success'));
        setOpen(false);
        setTitle('');
        setContent('');
        setAttachments([]);
        setUploaderKey((k) => k + 1);
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch {
      toast.error('Failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        aria-label={t('support.open_label')}
        onClick={() => setOpen(true)}
        className={cn(
          'fixed right-6 bottom-6 z-50 size-12 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'transition-all hover:scale-105 hover:shadow-xl'
        )}
      >
        {open ? <X className="size-5" /> : <LifeBuoy className="size-5" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('support.title')}</DialogTitle>
            <DialogDescription>{t('support.description')}</DialogDescription>
          </DialogHeader>

          {!isPending && !session?.user ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-muted-foreground text-sm">
                {t('support.sign_in_notice')}
              </p>
              <Link
                href={`/sign-in?callbackUrl=${encodeURIComponent(currentPathWithQuery('/'))}`}
                className={cn(buttonVariants())}
              >
                {t('support.sign_in')}
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="support-title">
                    {t('support.title_label')}
                  </Label>
                  <Input
                    id="support-title"
                    value={title}
                    maxLength={200}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('support.title_placeholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-content">
                    {t('support.content_label')}
                  </Label>
                  <Textarea
                    id="support-content"
                    value={content}
                    maxLength={5000}
                    rows={5}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('support.content_placeholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('support.attachments_label')}</Label>
                  <ImageUploader
                    key={uploaderKey}
                    allowMultiple
                    maxImages={9}
                    onChange={(items) => {
                      setAttachments(
                        items
                          .filter((i) => i.status === 'uploaded' && i.url)
                          .map((i) => i.url!)
                      );
                      setUploading(items.some((i) => i.status === 'uploading'));
                    }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {t('support.track_hint_prefix')}{' '}
                  <Link
                    href="/settings/tickets"
                    className="hover:text-foreground underline"
                  >
                    {t('support.track_hint_link')}
                  </Link>
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t('support.cancel')}
                </Button>
                <Button type="submit" disabled={submitting || uploading}>
                  {submitting ? t('support.submitting') : t('support.submit')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
