import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mot-de-passe',
  standalone: true,
  templateUrl: './mot-de-passe.component.html',
  styleUrls: ['./mot-de-passe.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterModule
  ]
})
export class MotDePasseComponent {
  form = {
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmation: ''
  };

  message = '';
  error = '';
  isSubmitting = false;

  // visibilité des champs
  showOld = false;
  showNew = false;
  showConfirm = false;

  userId: number = 0;

  constructor(private http: HttpClient, private auth: AuthService) {
    const user = this.auth.getUser();
    this.userId = user?.idUtilisateur || 0;
  }

  onSubmit(form: NgForm) {
    this.error = '';
    this.message = '';

    if (form.invalid) {
      this.error = 'Veuillez remplir correctement tous les champs.';
      return;
    }

    if (this.form.nouveauMotDePasse !== this.form.confirmation) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    const payload = {
      ancienMotDePasse: this.form.ancienMotDePasse,
      nouveauMotDePasse: this.form.nouveauMotDePasse
    };

    this.isSubmitting = true;

    this.http
      .put(
        `http://192.168.11.118:8080/utilisateur/${this.userId}/mot-de-passe`,
        payload
      )
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.message = 'Mot de passe changé avec succès.';
          this.form = { ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' };
          form.resetForm();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error =
            err?.status === 400 || err?.status === 401
              ? 'Ancien mot de passe incorrect.'
              : 'Une erreur est survenue. Veuillez réessayer.';
        }
      });
  }

  // Helpers pour les tooltips / accessibilité si besoin plus tard
  get hasFeedback(): boolean {
    return !!this.message || !!this.error;
  }
}
