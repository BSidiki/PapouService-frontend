import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ErrorService } from '../../services/error.service';
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

  constructor(private authService: AuthService, private router: Router, private errorService: ErrorService) {}

  // Validation assouplie du numéro de téléphone
  isValidPhoneNumber(): boolean {
    // Accepte: 75000000, 22675000000, +22675000000
    const phoneRegex = /^(\+226|226)?[0-9]{8}$/;
    const cleaned = this.credentials.numeroUtilisateur.replace(/\s+/g, '');
    return phoneRegex.test(cleaned);
  }

  isFormValid(): boolean {
    return this.isValidPhoneNumber() &&
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
        if (error.status === 0) {
          this.errorMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
        } else {
          this.errorMessage = 'Numéro de téléphone ou mot de passe incorrect.';
        }
        this.credentials.password = '';
      }
    });
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.errorService.info('Contactez le support au 04116262 pour réinitialiser votre mot de passe.');
  }
}
