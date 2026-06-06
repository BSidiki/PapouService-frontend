import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonFooter, IonIcon, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

@Component({
  selector: 'app-motif-rejet-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonFooter, IonIcon
  ],
  template: `
    <ion-header>
      <ion-toolbar color="danger">
        <ion-title>Motif de rejet</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()" aria-label="Annuler">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Motif du rejet</mat-label>
        <textarea matInput
                  [(ngModel)]="motif"
                  rows="4"
                  placeholder="Expliquez la raison du rejet..."></textarea>
      </mat-form-field>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end" class="footer-buttons">
          <ion-button fill="outline" (click)="dismiss()">Annuler</ion-button>
          <ion-button fill="solid" color="danger"
                      [disabled]="!motif.trim()"
                      (click)="confirm()">
            Rejeter
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .full-width { width: 100%; margin-top: 8px; }
    .footer-buttons { padding: 8px; gap: 8px; }
  `]
})
export class MotifRejetDialogComponent {
  @Input() type = '';
  motif = '';

  constructor(private modalController: ModalController) {
    addIcons({ close });
  }

  dismiss() {
    this.modalController.dismiss(null);
  }

  confirm() {
    if (this.motif.trim()) {
      this.modalController.dismiss(this.motif.trim());
    }
  }
}
