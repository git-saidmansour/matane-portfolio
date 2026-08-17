import webpush from 'web-push';
import { getPushSubscriptions, deletePushSubscription } from './db';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

const CV_LABELS: Record<string, string> = {
  'reseaux-cybersecurite': 'CV Réseaux & Cybersécurité',
  'data-ia': 'CV Data & IA',
};

export async function notifyCvDownload(type: string): Promise<void> {
  if (!ensureConfigured()) return;

  const subscriptions = getPushSubscriptions();
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: 'Téléchargement de CV',
    body: `${CV_LABELS[type] ?? type} vient d'être téléchargé.`,
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          deletePushSubscription(sub.endpoint);
        }
      }
    })
  );
}
