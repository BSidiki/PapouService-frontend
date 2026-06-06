import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  constructor(private toastController: ToastController) {}

  private async show(message: string, color: string, duration: number): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration,
      color,
      position: 'bottom',
      buttons: [{ text: 'Fermer', role: 'cancel' }]
    });
    await toast.present();
  }

  /** Affiche un message d'erreur adapté au code HTTP */
  handle(error: any, contexte = 'opération'): void {
    const status = error?.status;
    const msg =
      status === 0   ? 'Serveur inaccessible. Vérifiez votre connexion.' :
      status === 400 ? 'Données invalides. Vérifiez le formulaire et réessayez.' :
      status === 401 ? 'Session expirée. Veuillez vous reconnecter.' :
      status === 403 ? 'Action non autorisée.' :
      status === 404 ? 'Ressource introuvable.' :
      status === 500 ? 'Erreur serveur. Veuillez réessayer dans quelques instants.' :
                       `Erreur lors de l'${contexte}. Veuillez réessayer.`;
    this.show(`⚠️ ${msg}`, 'danger', 5000);
  }

  /** Affiche un message de succès */
  success(message: string): void {
    this.show(message, 'success', 4000);
  }

  /** Affiche un message d'info simple */
  info(message: string): void {
    this.show(message, 'medium', 3000);
  }

  /** Affiche un toast générique avec couleur personnalisée */
  toast(message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'medium', duration = 3000): void {
    this.show(message, color, duration);
  }
}
