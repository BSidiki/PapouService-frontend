import { LayoutHeaderComponent } from './../../../layout/header.component';
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-admin-clients',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule
  ],
  templateUrl: './admin-clients.component.html',
  styleUrls: ['./admin-clients.component.scss']
})
export class AdminClientsComponent implements OnInit {
  displayedColumns: string[] = ['prenom', 'nom', 'numero', 'actions'];
  dataSource = new MatTableDataSource<any>();
  search = '';

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.http.get<any[]>('http://192.168.244.230:8080/utilisateurs').subscribe(users => {
      const clients = users.filter(u => u.roles.some((r: any) => r.name === 'USER'));
      this.dataSource.data = clients;
      this.dataSource.sort = this.sort;
    });
  }

  applyFilter() {
    this.dataSource.filter = this.search.trim().toLowerCase();
  }

  voirProfil(id: number) {
    this.router.navigate(['/admin/clients', id]);
  }

  voirHistorique(id: number) {
    this.router.navigate(['/admin/clients', id, 'historique']);
  }

  supprimer(id: number) {
    if (confirm("Voulez-vous vraiment supprimer ce client ?")) {
      this.http.delete(`http://192.168.244.230:8080/utilisateurs/${id}`).subscribe(() => {
        this.dataSource.data = this.dataSource.data.filter(u => u.idUtilisateur !== id);
      });
    }
  }
}
