import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';

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
    MatCardModule
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
  userId: number = 0;

  constructor(private http: HttpClient, private auth: AuthService) {
    const user = this.auth.getUser();
    this.userId = user?.idUtilisateur || 0;
  }

  onSubmit() {
    this.error = '';
    this.message = '';

    if (this.form.nouveauMotDePasse !== this.form.confirmation) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }

    const payload = {
      ancienMotDePasse: this.form.ancienMotDePasse,
      nouveauMotDePasse: this.form.nouveauMotDePasse
    };

    this.http.put(`http://192.168.57.230:8080/utilisateur/${this.userId}/mot-de-passe`, payload)
      .subscribe({
        next: () => {
          this.message = 'Mot de passe changé avec succès';
          this.form = { ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' };
        },
        error: () => {
          this.error = 'Ancien mot de passe incorrect ou erreur serveur.';
        }
      });
  }
}
