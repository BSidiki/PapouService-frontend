import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-admin-administrateurs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './admin-administrateurs.component.html',
  styleUrls: ['./admin-administrateurs.component.scss']
})
export class AdminAdministrateursComponent implements OnInit {
  admins: any[] = [];
  form: FormGroup;

  constructor(private http: HttpClient, private fb: FormBuilder) {
    this.form = this.fb.group({
      nomUtilisateur: ['', Validators.required],
      prenomUtilisateur: ['', Validators.required],
      numeroUtilisateur: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins() {
    this.http.get<any[]>('http://192.168.244.230:8080/utilisateurs')
      .subscribe({
        next: data => this.admins = data.filter(u => u.roles?.some((r: any) => r.name === 'ADMIN')),
        error: err => console.error(err)
      });
  }

  ajouterAdmin() {
    if (this.form.invalid) return;

    const formData = new FormData();
    const valeur = this.form.value;
    formData.append('nomUtilisateur', valeur.nomUtilisateur);
    formData.append('prenomUtilisateur', valeur.prenomUtilisateur);
    formData.append('numeroUtilisateur', valeur.numeroUtilisateur);
    formData.append('password', valeur.password);
    formData.append('role', 'ADMIN');

    this.http.post('http://192.168.244.230:8080/utilisateurs', formData)
      .subscribe({
        next: () => {
          this.form.reset();
          this.loadAdmins();
        },
        error: err => alert("Erreur lors de l'ajout : " + err.error.message)
      });
  }

  supprimer(id: number) {
    if (confirm("Voulez-vous vraiment supprimer cet admin ?")) {
      this.http.delete(`http://192.168.244.230:8080/utilisateurs/${id}`)
        .subscribe({
          next: () => this.loadAdmins(),
          error: err => alert("Erreur : " + err.error.message)
        });
    }
  }
}
