import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { AuthService } from './../../../services/auth.service';
import { AnnoncesPublicComponent } from "../../annonces/annonces-public.component";

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatSelectModule, FormsModule, AnnoncesPublicComponent],
  templateUrl: './historique.component.html',
  styleUrls: ['./historique.component.scss']
})
export class HistoriqueComponent implements OnInit {
  historiques: any[] = [];
  filteredHistoriques: any[] = [];
  filter: string = 'ALL';
  statusFilter: string = 'ALL';
  userId: number = 0;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router) {
    const user = this.auth.getUser();
    if (user) this.userId = user.idUtilisateur;
  }

  ngOnInit(): void {
    this.http.get<any[]>(`http://192.168.57.230:8080/utilisateurs/${this.userId}/historiques`)
      .subscribe({
        next: data => {
          this.historiques = data.sort((a, b) => b.id_transaction - a.id_transaction);

          for (const item of this.historiques) {
            const url = item.transaction === 'DEPOT'
              ? `http://192.168.57.230:8080/depots/${item.id_transaction}`
              : `http://192.168.57.230:8080/retraits/${item.id_transaction}`;

            this.http.get<any>(url).subscribe({
              next: (details) => {
                item.date = details.dateDepot || details.dateRetrait || null;
                item.utilisateur = details.utilisateur;
                item.details = details;
                item.statut = details.transactionState; // ✅ Ajout du statut
                this.applyFilter();
              }
            });
          }
        },
        error: err => {
          console.error(err);
          alert('Erreur lors du chargement des historiques');
        }
      });
  }

  applyFilter() {
    this.filteredHistoriques = this.historiques.filter(h => {
      const matchType = this.filter === 'ALL' || h.transaction === this.filter;
      const matchStatus = this.statusFilter === 'ALL' || h.statut === this.statusFilter;
      return matchType && matchStatus;
    });
  }

  goToDetails(transaction: any) {
    if (transaction.transaction === 'DEPOT') {
      this.router.navigate(['/user/depot', transaction.id_transaction]);
    } else if (transaction.transaction === 'RETRAIT') {
      this.router.navigate(['/user/retrait', transaction.id_transaction]);
    }
  }
}
