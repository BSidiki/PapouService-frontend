import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AnnoncesPublicComponent } from "../../annonces/annonces-public.component";
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AnnoncesPublicComponent
  ],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss']
})
export class ProfilComponent implements OnInit {
  user: any = {};
  afficherProfil = false;
  depotCount = 0;
  fidelityStars = '';
  isFidele = false;

  constructor(private auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.user = { ...this.auth.getUser() };

    this.http.get<any[]>('http://192.168.57.230:8080/depots').subscribe(depots => {
      const validDepots = depots.filter(
        d => d.transactionState === 'VALIDATED' &&
             d.utilisateur?.numeroUtilisateur === this.user.numeroUtilisateur
      );

      this.depotCount = validDepots.length;
      const stars = Math.min(5, Math.floor(this.depotCount / 1)); // ⚠️ tu peux changer 1 en 5 si besoin
      this.fidelityStars = '★'.repeat(stars);
      this.isFidele = stars === 5;
    });
  }

  toggleAffichage() {
    this.afficherProfil = !this.afficherProfil;
  }

  modifierProfil() {
    const id = this.user.idUtilisateur;
    let params = new HttpParams()
      .set('nomUtilisateur', this.user.nomUtilisateur)
      .set('prenomUtilisateur', this.user.prenomUtilisateur)
      .set('numeroUtilisateur', this.user.numeroUtilisateur);

    if (this.user.id_1XBET) params = params.set('id_1XBET', this.user.id_1XBET);
    if (this.user.id_BETWINNER) params = params.set('id_BETWINNER', this.user.id_BETWINNER);
    if (this.user.id_MELBET) params = params.set('id_MELBET', this.user.id_MELBET);
    if (this.user.id_1WIN) params = params.set('id_1WIN', this.user.id_1WIN);
    if (this.user.id_888STARZ) params = params.set('id_888STARZ', this.user.id_888STARZ);

    this.http.put(`http://192.168.57.230:8080/utilisateurs/update/${id}`, null, { params }).subscribe({
      next: (res: any) => {
        alert('Profil mis à jour avec succès !');
        this.auth.saveUser(res);
      },
      error: err => {
        console.error(err);
        alert('Erreur lors de la mise à jour du profil.');
      }
    });
  }
}
