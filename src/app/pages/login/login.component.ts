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
    HeaderPublicComponent
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

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit() {
    this.loading = true;
    this.authService.login(this.credentials).subscribe({
      next: (user: any) => {
        this.authService.saveUser(user);
        const role = this.authService.getUserRole();
        this.loading = false;
        if (role === 'ADMIN') this.router.navigate(['/admin']);
        else if (role === 'USER') this.router.navigate(['/user']);
        else this.router.navigate(['/']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Numéro ou mot de passe incorrect';
      }
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}
