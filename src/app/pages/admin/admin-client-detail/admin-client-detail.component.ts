import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Location } from '@angular/common';

@Component({
  selector: 'app-admin-client-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './admin-client-detail.component.html',
  styleUrls: ['./admin-client-detail.component.scss']
})
export class AdminClientDetailComponent implements OnInit {
  client: any = null;
  isLoading = true;
  clientId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private location: Location
) {}

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    this.http.get(`http://192.168.244.230:8080/utilisateurs/getuser/${this.clientId}`).subscribe({
      next: (data) => {
        this.client = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        alert('Erreur lors du chargement du profil client.');
      }
    });
  }

  voirHistorique() {
    this.router.navigate([`/admin/clients/${this.clientId}/historique`]);
  }

  voirDepots() {
    this.router.navigate([`/admin/clients/${this.clientId}/depots`]);
  }

  voirRetraits() {
    this.router.navigate([`/admin/clients/${this.clientId}/retraits`]);
  }

  supprimerClient() {
    if (!confirm("Voulez-vous vraiment supprimer ce client ?")) return;
    this.http.delete(`http://192.168.244.230:8080/utilisateurs/${this.clientId}`).subscribe({
      next: () => {
        alert("Client supprimé avec succès.");
        this.router.navigate(['/admin/clients']);
      },
      error: (err) => {
        console.error(err);
        alert("Échec de la suppression du client.");
      }
    });
  }
  goBack() {
      this.location.back();
    }
}
