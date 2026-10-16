'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useSession } from '@/core/auth/client';
import { defaultLocale } from '@/config/locale';
import {
  isAllowedAppProtocolUrl,
  isAppProtocolUrl,
  safeInternalPath,
} from '@/lib/redirect';

/**
 * /auth-callback?redirect=<target>
 *
 * Landing pad between "you are now signed in" and where you were going:
 *
 * - internal path → straight there
 * - allow-listed app protocol (`myapp://…`) → fetch the session token and hand
 *   it to the client via `?token=…`; this is why the page exists at all, since
 *   better-auth can only redirect to http(s) origins it trusts
 *
 * Anything else falls back to `/`. The allow-list is the admin setting
 * `desktop_auth_schemes` — empty (the template default) means no hand-off.
 */
export default function AuthCallbackPage() {
  const t = useTranslations('common');
  const locale = useLocale();
  const { data: session, isPending } = useSession();
  const [configs, setConfigs] = useState<Record<string, string> | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/config/public', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => setConfigs(res.code === 0 ? res.data : {}))
      .catch(() => setConfigs({}));
  }, []);

  useEffect(() => {
    if (handledRef.current) return;
    if (isPending || configs === null) return;

    const localePrefix = locale !== defaultLocale ? `/${locale}` : '';
    const go = (path: string) =>
      window.location.replace(`${localePrefix}${path}`);

    const target = new URLSearchParams(window.location.search).get('redirect');
    const internalPath = safeInternalPath(target);

    // Web target, or nothing usable: no token involved, just go.
    if (!isAppProtocolUrl(target)) {
      handledRef.current = true;
      go(internalPath || '/');
      return;
    }

    if (!isAllowedAppProtocolUrl(target, configs.desktop_auth_schemes)) {
      handledRef.current = true;
      go('/');
      return;
    }

    // Signing in is what produces the token — bounce and come back.
    if (!session?.user) {
      handledRef.current = true;
      go(`/sign-in?redirect=${encodeURIComponent(target as string)}`);
      return;
    }

    handledRef.current = true;
    fetch('/api/auth/token', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.code !== 0 || !res.data?.token) {
          throw new Error(res.message || t('auth_callback.error'));
        }
        const url = target as string;
        const separator = url.includes('?') ? '&' : '?';
        window.location.href = `${url}${separator}token=${encodeURIComponent(
          res.data.token
        )}`;
      })
      .catch((err: Error) => {
        handledRef.current = false;
        setError(err.message || t('auth_callback.error'));
      });
  }, [isPending, session?.user, configs, locale, t]);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-3 p-6">
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <>
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
          <p className="text-muted-foreground text-sm">
            {t('auth_callback.redirecting')}
          </p>
        </>
      )}
    </div>
  );
}
