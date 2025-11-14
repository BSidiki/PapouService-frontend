import { Component } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderPublicComponent } from '../../layout/header-public/header-public.component';

@Component({
  selector: 'app-register',
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
    HeaderPublicComponent
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  user = {
    nomUtilisateur: '',
    prenomUtilisateur: '',
    numeroUtilisateur: '',
    password: '',
    id_1XBET: '',
    id_BETWINNER: '',
    id_MELBET: '',
    id_1WIN: '',
    id_888STARZ: ''
  };

  confirmPassword = '';
  hidePassword = true;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  // Formatage automatique du numéro de téléphone - ASSOUPLI
  onPhoneBlur() {
    if (this.user.numeroUtilisateur) {
      // Nettoyage du numéro
      let cleaned = this.user.numeroUtilisateur.replace(/\s+/g, '').replace(/[^\d+]/g, '');

      // Formatage optionnel : ajout du préfixe +226 seulement si l'utilisateur ne l'a pas fait
      // Mais ne force pas le formatage si c'est un numéro simple (75000000)
      if (cleaned.startsWith('226') && cleaned.length === 11) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('00226') && cleaned.length === 13) {
        cleaned = '+' + cleaned.substring(2);
      }
      // On ne force plus l'ajout de +226 pour les numéros à 8 chiffres
      // Le backend devrait accepter les deux formats

      this.user.numeroUtilisateur = cleaned;
    }
  }

  // Validation du numéro de téléphone - ASSOUPLIE
  isValidPhone(): boolean {
    // Accepte: 75000000, 22675000000, +22675000000
    const regex = /^(\+226|226)?[0-9]{8}$/;
    const cleaned = this.user.numeroUtilisateur.replace(/\s+/g, '');
    return regex.test(cleaned);
  }

  // Vérification de la correspondance des mots de passe
  isPasswordMatch(): boolean {
    return this.user.password === this.confirmPassword;
  }

  // Évaluation de la force du mot de passe
  getPasswordStrength(): number {
    if (!this.user.password) return 0;

    let strength = 0;
    if (this.user.password.length >= 6) strength += 1;
    if (this.user.password.length >= 8) strength += 1;
    if (/[A-Z]/.test(this.user.password)) strength += 1;
    if (/[0-9]/.test(this.user.password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(this.user.password)) strength += 1;

    return strength;
  }

  getPasswordStrengthClass(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 2) return 'Faible';
    if (strength <= 3) return 'Moyen';
    return 'Fort';
  }

  // Validation globale du formulaire
  formValid(): boolean {
    return this.user.nomUtilisateur.trim() !== '' &&
           this.user.prenomUtilisateur.trim() !== '' &&
           this.user.numeroUtilisateur.length >= 8 && // Validation basique de longueur
           this.user.password.length >= 6 &&
           this.isPasswordMatch();
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit() {
    if (!this.formValid()) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Préparer le numéro pour l'envoi (sans espaces)
    const numeroForBackend = this.user.numeroUtilisateur.replace(/\s+/g, '');

    const body = new HttpParams()
      .set('nomUtilisateur', this.user.nomUtilisateur.trim())
      .set('prenomUtilisateur', this.user.prenomUtilisateur.trim())
      .set('numeroUtilisateur', numeroForBackend)
      .set('password', this.user.password)
      .set('id_1XBET', this.user.id_1XBET.trim())
      .set('id_BETWINNER', this.user.id_BETWINNER.trim())
      .set('id_MELBET', this.user.id_MELBET.trim())
      .set('id_1WIN', this.user.id_1WIN.trim())
      .set('id_888STARZ', this.user.id_888STARZ.trim());

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    this.http.post('http://192.168.11.124:8080/utilisateurs', body, { headers }).subscribe({
      next: () => {
        this.successMessage = 'Inscription réussie !';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 409) {
          this.errorMessage = 'Ce numéro de téléphone est déjà utilisé.';
        } else if (err.status === 0) {
          this.errorMessage = 'Impossible de se connecter au serveur. Veuillez réessayer.';
        } else {
          this.errorMessage = 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.';
        }
        console.error('Erreur d\'inscription:', err);
      }
    });
  }
}
