importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSy...",
  authDomain: "lsilvaa-run.firebaseapp.com",
  projectId: "lsilvaa-run",
  storageBucket: "lsilvaa-run.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
})

const messaging = firebase.messaging()

// Lidar com notificações em background
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)
  
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: payload.data
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Lidar com clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  // Abrir URL específica
  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    )
  }
})