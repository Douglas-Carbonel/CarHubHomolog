import { apiRequest } from './queryClient';

export class NotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  async initialize(): Promise<boolean> {
    try {
      // Check if browser supports notifications
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        return false;
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async subscribe(): Promise<boolean> {
    try {
      if (!this.registration) {
        console.error('Service worker not registered');
        return false;
      }

      // First, unsubscribe from any existing subscription to avoid VAPID conflicts
      const existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Removing existing subscription to refresh VAPID keys...');
        await existingSubscription.unsubscribe();
      }

      // Get VAPID public key from server
      const response = await fetch('/api/notifications/vapid-key');
      if (!response.ok) {
        throw new Error(`Failed to get VAPID key: ${response.status}`);
      }

      const { publicKey } = await response.json();

      if (!publicKey) {
        console.error('No VAPID public key received');
        return false;
      }

      console.log('Got VAPID public key, subscribing...');

      // Subscribe to push notifications with new VAPID key
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      console.log('Push subscription created:', this.subscription);

      // Send subscription to server
      const p256dhKey = this.subscription.getKey('p256dh');
      const authKey = this.subscription.getKey('auth');

      const subscribeResponse = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint,
          p256dh: p256dhKey ? btoa(String.fromCharCode(...new Uint8Array(p256dhKey))) : '',
          auth: authKey ? btoa(String.fromCharCode(...new Uint8Array(authKey))) : ''
        })
      });

      if (!subscribeResponse.ok) {
        const errorText = await subscribeResponse.text();
        console.error('Server error:', errorText);
        throw new Error(`Server returned ${subscribeResponse.status}: ${errorText}`);
      }

      console.log('Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
      }

      // Notify server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST'
      });

      console.log('Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.registration) {
        return false;
      }

      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription !== null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  async sendTestNotification(title?: string, body?: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Test notification failed:', errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationManager = new NotificationManager();