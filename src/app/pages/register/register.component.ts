import { Component } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  CommonModule
} from '@angular/common';
import {
  FormsModule
} from '@angular/forms';
import {
  MatCardModule
} from '@angular/material/card';
import {
  MatFormFieldModule
} from '@angular/material/form-field';
import {
  MatInputModule
} from '@angular/material/input';
import {
  MatButtonModule
} from '@angular/material/button';
import {
  MatIconModule
} from '@angular/material/icon';
import {
  MatProgressSpinnerModule
} from '@angular/material/progress-spinner';
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
    id_1WIN: ''
  };

  confirmPassword = '';
  hidePassword = true;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  isValidPhone(): boolean {
    const regex = /^(\+226|00226|226)?[0-9]{8}$/;
    return regex.test(this.user.numeroUtilisateur);
  }

  isPasswordMatch(): boolean {
    return this.user.password === this.confirmPassword;
  }

  formValid(): boolean {
    return typeof this.user.nomUtilisateur === 'string' && this.user.nomUtilisateur.trim() !== '' &&
      typeof this.user.prenomUtilisateur === 'string' && this.user.prenomUtilisateur.trim() !== '' &&
      this.isValidPhone() &&
      typeof this.user.password === 'string' && this.user.password.trim() !== '' &&
      typeof this.confirmPassword === 'string' && this.confirmPassword.trim() !== '' &&
      this.isPasswordMatch();
  }

  onSubmit() {
    if (!this.formValid()) return;
    this.loading = true;

    const body = new HttpParams()
      .set('nomUtilisateur', this.user.nomUtilisateur)
      .set('prenomUtilisateur', this.user.prenomUtilisateur)
      .set('numeroUtilisateur', this.user.numeroUtilisateur)
      .set('password', this.user.password)
      .set('id_1XBET', this.user.id_1XBET || '')
      .set('id_BETWINNER', this.user.id_BETWINNER || '')
      .set('id_MELBET', this.user.id_MELBET || '')
      .set('id_1WIN', this.user.id_1WIN || '');

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    this.http.post('http://192.168.244.230:8080/utilisateurs', body, { headers }).subscribe({
      next: () => {
        this.successMessage = '✅ Inscription réussie !';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: err => {
        this.errorMessage = '❌ Échec de l\'inscription.';
        this.loading = false;
        console.error(err);
      }
    });
  }
}
