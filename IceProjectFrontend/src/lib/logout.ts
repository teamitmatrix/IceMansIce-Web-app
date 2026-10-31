"use client";

import { deleteCookie } from 'cookies-next';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Standardized logout routine: clears all known auth storage/cookies
 * and redirects user to /login.
 */
export function performLogout(router: AppRouterInstance) {
  try {
    // Local storage keys that might exist
    const keys = [
      'token',
      'accessToken',
      'refreshToken',
      'user'
    ];
    keys.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });

    // Clear possible auth cookies
    try { deleteCookie('token'); } catch {}
    try { deleteCookie('accessToken'); } catch {}
    try { deleteCookie('refreshToken'); } catch {}
  } catch (e) {
    // swallow
  } finally {
    router.push('/login');
  }
}
