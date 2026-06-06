import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  ActionPerformed,
  PushNotificationSchema
} from '@capacitor/push-notifications';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class PushService {
  constructor(private errorService: ErrorService) {}

  /**
   * Initialise les push notifications (mobile uniquement).
   * Appelé au démarrage de l'app via APP_INITIALIZER.
   */
  async init(): Promise<void> {
    // Push notifications désactivées : nécessite google-services.json (Firebase)
    // Pour activer : créer un projet Firebase, télécharger google-services.json
    // et le placer dans android/app/ puis décommenter le code ci-dessous
    return;

    /* eslint-disable no-unreachable */
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { receive } = await PushNotifications.requestPermissions();
      if (receive !== 'granted') return;

      PushNotifications.addListener('registration', (token: Token) => {
        console.log('[Push] FCM Token:', token.value);
      });

      PushNotifications.addListener('registrationError', (err: any) => {
        console.warn('[Push] Erreur enregistrement (non bloquant):', err);
      });

      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          const msg = notification.body ?? notification.title ?? 'Nouvelle notification';
          this.errorService.info(msg);
        }
      );

      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('[Push] Action:', action.actionId, action.notification);
        }
      );

      await PushNotifications.register();
    } catch (err) {
      console.warn('[Push] Init échoué (non bloquant):', err);
    }
  }
}
