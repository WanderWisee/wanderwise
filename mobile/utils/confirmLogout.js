import { listPendingTripIds } from '../services/offlineStore';

// Logout confirmation (Settings and the Menu). Warns when trip edits made
// offline haven't been sent yet, since logging out clears them.
export async function confirmLogout(confirm, t) {
  const pending = await listPendingTripIds();
  return confirm({
    title: t('logoutConfirmTitle'),
    message: pending.length ? t('logoutPendingMessage') : t('logoutConfirmMessage'),
    confirmLabel: t('logout'),
    cancelLabel: t('cancel'),
    danger: pending.length > 0,
  });
}
