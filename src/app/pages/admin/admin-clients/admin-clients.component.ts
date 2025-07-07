import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { ChartConfiguration } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-admin-clients',
  templateUrl: './admin-clients.component.html',
  styleUrls: ['./admin-clients.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    NgChartsModule
  ],
})
export class AdminClientsComponent implements OnInit {
  displayedColumns: string[] = ['prenom', 'nom', 'numero', 'fidelity', 'actions'];
  dataSource = new MatTableDataSource<any>();
  search = '';
  selectedStarFilter = ''; // ⭐

  @ViewChild(MatSort) sort!: MatSort;

  chartLabels: string[] = ['0⭐', '1⭐', '2⭐', '3⭐', '4⭐', '5⭐'];
  chartData: number[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.http.get<any[]>('http://192.168.11.100:8080/utilisateurs').subscribe(users => {
      const clients = users.filter(u => u.roles?.some((r: any) => r.name === 'USER'));
      this.http.get<any[]>('http://192.168.11.100:8080/depots').subscribe(depots => {
        const validatedDepots = depots.filter(d => d.transactionState === 'VALIDATED');

        const clientsWithFidelity = clients.map(client => {
          const depotCount = validatedDepots.filter(
            d => d.utilisateur?.numeroUtilisateur === client.numeroUtilisateur
          ).length;

          const stars = Math.min(5, Math.floor(depotCount / 1));
          return {
            ...client,
            depotCount,
            fidelityStars: '★'.repeat(stars),
            isFidele: stars === 5,
            stars
          };
        });

        this.dataSource.data = clientsWithFidelity;
        this.dataSource.sort = this.sort;
        this.updateChart(clientsWithFidelity);
      });
    });
  }

  updateChart(data: any[]) {
    this.chartData = [0, 0, 0, 0, 0, 0];
    data.forEach(c => this.chartData[c.stars]++);
  }

  applyFilter() {
    this.dataSource.filter = this.search.trim().toLowerCase();
  }

  filterByStars() {
    const selected = +this.selectedStarFilter;
    if (!selected && selected !== 0) return;
    this.dataSource.data = this.dataSource.data.filter(client => client.stars === selected);
  }

  resetFilter() {
    this.ngOnInit();
    this.selectedStarFilter = '';
  }

  voirProfil(id: number) {
    this.router.navigate(['/admin/clients', id]);
  }

  voirHistorique(id: number) {
    this.router.navigate(['/admin/clients', id, 'historique']);
  }

  supprimer(id: number) {
    if (confirm("Voulez-vous vraiment supprimer ce client ?")) {
      this.http.delete(`http://192.168.11.109:8080/utilisateurs/${id}`).subscribe(() => {
        this.dataSource.data = this.dataSource.data.filter(u => u.idUtilisateur !== id);
        this.updateChart(this.dataSource.data);
      });
    }
  }
}
