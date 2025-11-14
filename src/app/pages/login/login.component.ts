import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderPublicComponent } from '../../layout/header-public/header-public.component';
import { FooterComponent } from "../../layout/footer/footer.component";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    HeaderPublicComponent,
    FooterComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  credentials = { numeroUtilisateur: '', password: '' };
  errorMessage = '';
  hidePassword = true;
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  // Validation assouplie du numéro de téléphone
  isValidPhoneNumber(): boolean {
    // Accepte: 75000000, 22675000000, +22675000000
    const phoneRegex = /^(\+226|226)?[0-9]{8}$/;
    const cleaned = this.credentials.numeroUtilisateur.replace(/\s+/g, '');
    return phoneRegex.test(cleaned);
  }

  // Validation du formulaire - plus permissive pour le numéro
  isFormValid(): boolean {
    return this.credentials.numeroUtilisateur.length >= 8 &&
           this.credentials.password.length >= 6;
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit() {
    if (!this.isFormValid()) return;

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (user: any) => {
        this.authService.saveUser(user);
        const role = this.authService.getUserRole();
        this.loading = false;

        // Redirection basée sur le rôle
        if (role === 'ADMIN') this.router.navigate(['/admin']);
        else if (role === 'USER') this.router.navigate(['/user']);
        else this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.message || 'Numéro ou mot de passe incorrect';

        // Réinitialiser le mot de passe en cas d'erreur
        this.credentials.password = '';
      }
    });
  }

  // Gestion du mot de passe oublié
  onForgotPassword(event: Event) {
    event.preventDefault();
    // Implémentation future pour la réinitialisation du mot de passe
    alert('Fonctionnalité de réinitialisation de mot de passe à venir.');
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}
