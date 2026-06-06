import { Component, Input } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonIcon, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

@Component({
  selector: 'app-image-dialog',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Preuve de transaction</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()" aria-label="Fermer">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <img [src]="image" class="zoomed-image" alt="Preuve de transaction" />
    </ion-content>
  `,
  styles: [`
    .zoomed-image {
      width: 100%;
      height: auto;
      max-width: 100%;
      border-radius: 8px;
      display: block;
    }
  `]
})
export class ImageDialogComponent {
  @Input() image = '';

  constructor(private modalController: ModalController) {
    addIcons({ close });
  }

  dismiss() {
    this.modalController.dismiss();
  }
}
