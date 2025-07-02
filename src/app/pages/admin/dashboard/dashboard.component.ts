// dashboard.component.ts
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChartConfiguration } from 'chart.js';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { NgChartsModule } from 'ng2-charts';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatSortModule,
    NgChartsModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  totalDepotsMontant = 0;
  totalRetraitsMontant = 0;
  nombreClients = 0;
  totalDepotsValides = 0;
  totalRetraitsValides = 0;

  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = ['type', 'montant', 'numero', 'date'];

  @ViewChild(MatSort) sort!: MatSort;

  donutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Dépôts', 'Retraits'],
    datasets: [
      {
        data: [0, 0],
        backgroundColor: ['#4caf50', '#f44336']
      }
    ]
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadDonnees();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  loadDonnees() {
    const transactions: any[] = [];

    this.http.get<any[]>('http://192.168.244.230:8080/depots').subscribe(depots => {
      depots = depots || [];
      this.totalDepotsMontant = depots.reduce((sum, d) => sum + (d.montant || 0), 0);
      this.totalDepotsValides = depots.filter(d => d.valide === true).length;

      this.donutChartData.datasets[0].data[0] = this.totalDepotsMontant;
      transactions.push(...depots.map(d => ({
        type: 'Dépôt',
        montant: d.montant,
        numero: d.numeroEnvoyant,
        date: d.dateDepot,
        id: d.idDepot
      })));
      this.updateDataSource(transactions);
    });

    this.http.get<any[]>('http://192.168.244.230:8080/retraits').subscribe(retraits => {
      retraits = retraits || [];
      this.totalRetraitsMontant = retraits.reduce((sum, r) => sum + (r.montant || 0), 0);
      this.totalRetraitsValides = retraits.filter(r => r.valide === true).length;

      this.donutChartData.datasets[0].data[1] = this.totalRetraitsMontant;
      transactions.push(...retraits.map(r => ({
        type: 'Retrait',
        montant: r.montant,
        numero: r.numeroEnvoyant,
        date: r.dateRetrait,
        id: r.idRetrait
      })));
      this.updateDataSource(transactions);
    });

    this.http.get<any[]>('http://192.168.244.230:8080/utilisateurs').subscribe(clients => {
      this.nombreClients = (clients || []).length;
    });
  }


  updateDataSource(data: any[]) {
    this.dataSource.data = data;
  }

  goToDetails(row: any) {
    if (row.type === 'Dépôt') {
      this.router.navigate(['/user/depot', row.id]);
    } else {
      this.router.navigate(['/user/retrait', row.id]);
    }
  }
}
