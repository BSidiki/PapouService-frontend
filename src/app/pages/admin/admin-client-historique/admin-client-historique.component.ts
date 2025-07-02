import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';

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
  clientId!: string;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id')!;
    this.http.get<any[]>(`http://192.168.244.230:8080/utilisateurs/${this.clientId}/historiques`).subscribe({
      next: (data) => {
        this.historiques = data.reverse();
        this.applyFilter();
      },
      error: (err) => {
        console.error(err);
        alert("Erreur lors du chargement de l'historique");
      }
    });
  }

  applyFilter() {
    this.filtered = this.filterType === 'ALL'
      ? this.historiques
      : this.historiques.filter(item => item.transaction === this.filterType);
  }

  voirDetails(item: any) {
    const base = item.transaction === 'DEPOT' ? '/user/depot' : '/user/retrait';
    this.router.navigate([base, item.id_transaction]);
  }
  goBack() {
    this.location.back();
  }
}
