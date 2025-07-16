import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-client-historique',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    FormsModule
  ],
  templateUrl: './admin-client-historique.component.html',
  styleUrls: ['./admin-client-historique.component.scss']
})
export class AdminClientHistoriqueComponent implements OnInit {
  historiques: any[] = [];
  filtered: any[] = [];
  filterType: string = 'ALL';
  statusFilter: string = 'ALL';
  clientId!: string;
  userId: number = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private location: Location
  ) {
    const user = this.auth.getUser();
    if (user) this.userId = user.idUtilisateur;
  }

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id')!;

    this.http.get<any[]>(`http://192.168.57.230:8080/utilisateurs/${this.clientId}/historiques`)
      .subscribe({
        next: (data) => {
          this.historiques = data.sort((a, b) => b.id_transaction - a.id_transaction);
          const requests = this.historiques.map((item) => {
            const url = item.transaction === 'DEPOT'
              ? `http://192.168.57.230:8080/depots/${item.id_transaction}`
              : `http://192.168.57.230:8080/retraits/${item.id_transaction}`;

            return this.http.get<any>(url).toPromise().then(details => {
              item.date = details.dateDepot || details.dateRetrait || null;
              item.utilisateur = details.utilisateur;
              item.details = details;
              item.statut = details.transactionState;
            }).catch(() => {
              item.details = {};
              item.date = null;
              item.statut = 'INCONNU';
            });
          });

          Promise.all(requests).then(() => {
            this.applyFilter();
          });
        },
        error: (err) => {
          console.error(err);
          alert('Erreur lors du chargement des historiques');
        }
      });
  }

  applyFilter() {
    this.filtered = this.historiques.filter((t: any) => {
      const matchType = this.filterType === 'ALL' || t.transaction === this.filterType;
      const matchStatus = this.statusFilter === 'ALL' || t.statut === this.statusFilter;
      return matchType && matchStatus;
    });
  }

  voirDetails(item: any) {
    const base = item.transaction === 'DEPOT' ? '/user/depot' : '/user/retrait';
    this.router.navigate([base, item.id_transaction]);
  }

  goBack() {
    this.location.back();
  }
}
