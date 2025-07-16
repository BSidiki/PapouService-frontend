import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-validations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSelectModule,
    MatCardModule,
    MatButtonModule,
  ],
  templateUrl: './admin-validations.component.html',
  styleUrls: ['./admin-validations.component.scss']
})
export class AdminValidationsComponent implements OnInit {
  filter: 'DEPOT' | 'RETRAIT' = 'DEPOT';
  transactions: any[] = [];
  loading = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.chargerTransactions();
  }

  chargerTransactions() {
    this.loading = true;
    const endpoint = this.filter === 'DEPOT'
      ? 'http://192.168.57.230:8080/depots'
      : 'http://192.168.57.230:8080/retraits';

    this.http.get<any[]>(endpoint).subscribe({
      next: data => {
        this.transactions = data.filter(t => !t.valide); // Si champ "valide" présent
        this.loading = false;
      },
      error: () => {
        alert('Erreur lors du chargement.');
        this.loading = false;
      }
    });
  }

  onFilterChange() {
    this.chargerTransactions();
  }

  validerTransaction(id: number) {
    alert(`✅ Transaction ${id} validée (action simulée).`);
    // TODO: Intégrer appel PUT/POST vers backend pour marquer comme validé.
  }

  voirDetails(t: any) {
    if (this.filter === 'DEPOT') {
      this.router.navigate(['/user/depot', t.idDepot]);
    } else {
      this.router.navigate(['/user/retrait', t.idRetrait]);
    }
  }

  toBase64(data: number[] | string): string {
    return typeof data === 'string'
      ? 'data:image/jpeg;base64,' + data
      : 'data:image/jpeg;base64,' + btoa(String.fromCharCode(...new Uint8Array(data)));
  }
}
