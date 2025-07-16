import { Component, OnInit, ViewChild, AfterViewInit, inject, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { ChartConfiguration } from 'chart.js';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { CommonModule, formatDate } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { NgChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatSortModule,
    NgChartsModule,
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatPaginatorModule,
    MatButtonModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  totalDepotsMontant = 0;
  totalRetraitsMontant = 0;
  totalDepotsValides = 0;
  totalRetraitsValides = 0;
  depotsPendingCount = 0;
  retraitsPendingCount = 0;
  nombreClients = 0;
  allTransactions: any[] = [];

  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = ['type', 'nom', 'numero', 'plateforme', 'idPlateforme', 'montant', 'date', 'capture', 'actions'];
  filterType: 'ALL' | 'Dépôt' | 'Retrait' = 'ALL';
  filterPlateforme: 'ALL' | 'IXBET' | 'BETWINNER' | 'MELBET' | 'IWIN' = 'ALL';

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  donutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Dépôts validés', 'Retraits validés'],
    datasets: [{ data: [0, 0], backgroundColor: ['#4caf50', '#f44336'] }]
  };

  ngOnInit(): void {
    this.loadDonnees();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadDonnees() {
    const transactions: any[] = [];
    this.totalDepotsValides = 0;
    this.totalRetraitsValides = 0;
    this.depotsPendingCount = 0;
    this.retraitsPendingCount = 0;

    this.http.get<any[]>('http://192.168.57.230:8080/depots').subscribe(depots => {
      depots = depots || [];
      this.totalDepotsValides = depots.filter(d => d.transactionState === 'VALIDATED').reduce((sum, d) => sum + (d.montant || 0), 0);
      const pendingDepots = depots.filter(d => d.transactionState === 'PENDING');
      this.depotsPendingCount = pendingDepots.length;

      transactions.push(...pendingDepots.map(d => ({
        type: 'Dépôt',
        montant: d.montant,
        numero: d.numeroEnvoyant,
        date: d.dateDepot,
        plateforme: d.optionDeTransaction,
        id: d.idDepot,
        userId: d.utilisateur?.idUtilisateur || 1,
        nom: d.utilisateur?.prenomUtilisateur + ' ' + d.utilisateur?.nomUtilisateur,
        idPlateforme: this.getUserPlatformId(d),
        capture: d.capture
      })));

      this.http.get<any[]>('http://192.168.57.230:8080/retraits').subscribe(retraits => {
        retraits = retraits || [];
        this.totalRetraitsValides = retraits.filter(r => r.transactionState === 'VALIDATED').reduce((sum, r) => sum + (r.montant || 0), 0);
        const pendingRetraits = retraits.filter(r => r.transactionState === 'PENDING');
        this.retraitsPendingCount = pendingRetraits.length;

        transactions.push(...pendingRetraits.map(r => ({
          type: 'Retrait',
          montant: r.montant,
          numero: r.numeroEnvoyant,
          date: r.dateRetrait,
          plateforme: r.optionDeTransaction,
          id: r.idRetrait,
          userId: r.utilisateur?.idUtilisateur || 1,
          nom: r.utilisateur?.prenomUtilisateur + ' ' + r.utilisateur?.nomUtilisateur,
          idPlateforme: this.getUserPlatformId(r),
          capture: r.file
        })));

        this.donutChartData.datasets[0].data[0] = this.totalDepotsValides;
        this.donutChartData.datasets[0].data[1] = this.totalRetraitsValides;

        this.allTransactions = transactions;
        this.updateDataSource(transactions);
      });
    });

    this.http.get<any[]>('http://192.168.57.230:8080/utilisateurs').subscribe(clients => {
      this.nombreClients = (clients || []).length;
    });
  }

  getUserPlatformId(data: any): string {
    const p = data.optionDeTransaction;
    const u = data.utilisateur;
    if (!u) return '—';
    switch (p) {
      case 'IXBET': return u.id_1XBET;
      case 'BETWINNER': return u.id_BETWINNER;
      case 'MELBET': return u.id_MELBET;
      case 'IWIN': return u.id_1WIN;
      default: return '—';
    }
  }

  updateDataSource(data: any[]) {
    const filtered = data.filter(row => {
      const matchType = this.filterType === 'ALL' || row.type === this.filterType;
      const matchPlatform = this.filterPlateforme === 'ALL' || row.plateforme === this.filterPlateforme;
      return matchType && matchPlatform;
    });
    this.dataSource.data = filtered;
  }

  traiter(row: any, etat: 'VALIDATED' | 'REJECTED') {
    if (etat === 'REJECTED') {
      const dialogRef = this.dialog.open(MotifRejetDialogComponent, {
        width: '400px',
        data: { type: row.type }
      });

      dialogRef.afterClosed().subscribe(motif => {
        if (motif) {
          this.snackBar.open(`Transaction rejetée ❌ | Motif: ${motif}`, 'Fermer', { duration: 5000 });
          // ici on pourrait envoyer le motif à un service externe ou l'enregistrer localement
          const url = row.type === 'Dépôt'
            ? `http://192.168.57.230:8080/depots/${row.userId}/${row.id}/REJECTED`
            : `http://192.168.57.230:8080/retraits/${row.userId}/${row.id}/REJECTED`;

          this.http.put(url, {}).subscribe(() => this.loadDonnees());
        }
      });
    } else {
      const url = row.type === 'Dépôt'
        ? `http://192.168.57.230:8080/depots/${row.userId}/${row.id}/VALIDATED`
        : `http://192.168.57.230:8080/retraits/${row.userId}/${row.id}/VALIDATED`;

      this.http.put(url, {}).subscribe({
        next: () => {
          this.snackBar.open(`Transaction validée ✅`, 'Fermer', { duration: 3000 });
          this.loadDonnees();
        },
        error: () => {
          this.snackBar.open(`Erreur lors du traitement ❌`, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  showImageZoom(capture: any) {
    const imageUrl = `data:image/jpeg;base64,${capture}`;
    this.dialog.open(ImageDialogComponent, {
      data: { image: imageUrl },
      panelClass: 'image-dialog',
      width: '800px',
      maxHeight: '90vh'
    });
  }

  formatDate(date: string): string {
    return formatDate(date, 'dd/MM/yyyy HH:mm:ss', 'fr-FR');
  }
}

@Component({
  selector: 'image-dialog',
  template: `<img [src]="data.image" class="zoomed-image" />`,
  styles: [`.zoomed-image { width: 100%; height: auto; max-width: 100%; border-radius: 8px; }`]
})
export class ImageDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { image: string }) {}
}

@Component({
  selector: 'motif-rejet-dialog',
  standalone: true,
  template: `
    <h2 mat-dialog-title>Motif de rejet</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Motif</mat-label>
        <textarea matInput [(ngModel)]="motif" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="motif">Rejeter</button>
    </mat-dialog-actions>
  `,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
})
export class MotifRejetDialogComponent {
  motif = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: { type: string }) {}
}
