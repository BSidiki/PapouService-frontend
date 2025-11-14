import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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

  envoyer() {
    console.log('Message simulé envoyé:', this.contact);
    this.messageEnvoye = true;
    this.contact = { nom: '', email: '', message: '' };

    // Reset du message après 5 secondes
    setTimeout(() => {
      this.messageEnvoye = false;
    }, 5000);
  }
}
