'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { apiClient, authApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export default function SsoCallbackPage() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const { setUser, setOrganizations } = useAuthStore();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // The SSO callback on the API already set the refreshToken cookie;
    // this page just has to exchange it for an access token and hydrate
    // the auth store, the same way a normal login response would.
    let cancelled = false;

    (async () => {
      try {
        const refreshed = await authApi.refresh();
        apiClient.setAccessToken(refreshed.data.accessToken);

        const me = await authApi.me();
        if (cancelled) return;

        setUser(me.data.user);
        setOrganizations(me.data.user.userOrganizations || []);
        router.replace('/dashboard');
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, setUser, setOrganizations]);

  if (failed) {
    return (
      <div className="auth-form">
        <h1 className="auth-form__title">{t('title')}</h1>
        <p className="auth-form__sub">{t('errors.ssoFailed')}</p>
        <Link href="/login" className="auth-form__alt-link">
          {t('title')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h1 className="auth-form__title">{t('title')}</h1>
      <p className="auth-form__sub">{t('ssoRedirecting')}</p>
    </div>
  );
}
