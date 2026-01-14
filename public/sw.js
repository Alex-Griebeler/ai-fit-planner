// Service Worker for Push Notifications
const CACHE_NAME = 'evolve-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing.');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating.');
  event.waitUntil(clients.claim());
});

// Push event - receive push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'Evolve Fitness',
    body: 'Você tem uma notificação!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || {},
      };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: data.data,
    actions: getActionsForType(data.data?.type),
    tag: data.data?.type || 'general',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Get notification actions based on type
function getActionsForType(type) {
  switch (type) {
    case 'workout_reminder':
      return [
        { action: 'start', title: '🏋️ Iniciar Treino' },
        { action: 'dismiss', title: 'Depois' },
      ];
    case 'achievement':
      return [
        { action: 'view', title: '🏆 Ver Conquista' },
      ];
    case 'streak_warning':
      return [
        { action: 'start', title: '🔥 Treinar Agora' },
      ];
    default:
      return [];
  }
}

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/dashboard';

  // Handle action clicks
  if (event.action === 'start') {
    url = '/dashboard';
  } else if (event.action === 'view' && data.type === 'achievement') {
    url = '/achievements';
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});
