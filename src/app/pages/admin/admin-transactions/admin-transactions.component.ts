import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  templateUrl: './admin-transactions.component.html',
  styleUrls: ['./admin-transactions.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
]
})
export class AdminTransactionsComponent implements OnInit {
  type: 'ALL' | 'DEPOT' | 'RETRAIT' = 'ALL';
  search = '';
  plateforme = '';
  displayedColumns = ['type', 'nom', 'numero', 'montant', 'plateforme', 'date', 'actions'];
  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions() {
    const requests = [
      this.http.get<any[]>('http://192.168.244.230:8080/depots'),
      this.http.get<any[]>('http://192.168.244.230:8080/retraits')
    ];

    Promise.all(requests.map(req => req.toPromise())).then(([depots, retraits]) => {
      const transactions = [
        ...(depots ?? []).map(d => ({ ...d, type: 'DEPOT' })),
        ...(retraits ?? []).map(r => ({ ...r, type: 'RETRAIT' }))
      ];
      this.dataSource.data = transactions;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    });
  }

  applyFilter() {
    this.dataSource.filterPredicate = (data, filter) => {
      const matchesType = this.type === 'ALL' || data.type === this.type;
      const matchesSearch =
        !this.search ||
        data.utilisateur?.nomUtilisateur?.toLowerCase().includes(this.search.toLowerCase()) ||
        data.utilisateur?.prenomUtilisateur?.toLowerCase().includes(this.search.toLowerCase()) ||
        data.numeroEnvoyant?.includes(this.search);
      const matchesPlateforme = !this.plateforme || data.optionDeTransaction === this.plateforme;
      return matchesType && matchesSearch && matchesPlateforme;
    };
    this.dataSource.filter = '' + Math.random(); // Force update
  }

  voirDetails(t: any) {
    if (t.type === 'DEPOT') {
      this.router.navigate(['/user/depot', t.idDepot]);
    } else {
      this.router.navigate(['/user/retrait', t.idRetrait]);
    }
  }
}
