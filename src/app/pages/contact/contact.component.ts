import { Component } from '@angular/core';
import { ErrorService } from '../../services/error.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { FooterComponent } from "../../layout/footer/footer.component";
import { HeaderPublicComponent } from "../../layout/header-public/header-public.component";

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterModule,
    FooterComponent,
    HeaderPublicComponent
  ],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  contact = { nom: '', email: '', message: '' };
  messageEnvoye = false;
  loading = false;

  constructor(private errorService: ErrorService) {}

  isValidEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contact.email);
  }

  isFormValid(): boolean {
    return !!this.contact.nom.trim() && this.isValidEmail() && !!this.contact.message.trim();
  }

  envoyer() {
    if (!this.isFormValid()) {
      this.errorService.info('Veuillez remplir correctement tous les champs.');
      return;
    }

    this.loading = true;

    // Simulation d'envoi (remplacer par un vrai appel API si disponible)
    setTimeout(() => {
      this.loading = false;
      this.messageEnvoye = true;
      this.contact = { nom: '', email: '', message: '' };
      this.errorService.info('Message envoyé ! Nous vous répondrons rapidement.');

      setTimeout(() => { this.messageEnvoye = false; }, 8000);
    }, 1000);
  }
}
