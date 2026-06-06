import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UtilisateurService } from '../../services/utilisateur.service';

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

  constructor(private auth: AuthService, private utilisateurService: UtilisateurService) {
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
      ancienPassword: this.form.ancienMotDePasse,
      nouveauPassword: this.form.nouveauMotDePasse,
      confirmPassword: this.form.confirmation
    };

    this.isSubmitting = true;

    this.utilisateurService.changePassword(this.userId, payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.message = 'Mot de passe changé avec succès.';
        this.form = { ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' };
        form.resetForm();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.error =
          err?.status === 400 || err?.status === 401
            ? 'Ancien mot de passe incorrect.'
            : 'Une erreur est survenue. Veuillez réessayer.';
      }
    });
  }

  get hasFeedback(): boolean {
    return !!this.message || !!this.error;
  }

  get passwordsMatch(): boolean {
    return !this.form.confirmation || this.form.nouveauMotDePasse === this.form.confirmation;
  }

  getPasswordStrength(): number {
    const p = this.form.nouveauMotDePasse;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }

  getPasswordStrengthClass(): string {
    const s = this.getPasswordStrength();
    if (s <= 2) return 'weak';
    if (s <= 3) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    const s = this.getPasswordStrength();
    if (s <= 2) return 'Faible';
    if (s <= 3) return 'Moyen';
    return 'Fort';
  }
}

