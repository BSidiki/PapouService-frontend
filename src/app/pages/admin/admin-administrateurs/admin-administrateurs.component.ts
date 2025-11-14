import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';

type Utilisateur = {
  idUtilisateur: number;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  numeroUtilisateur: string;
  roles?: { name: string }[];
};

@Component({
  selector: 'app-admin-administrateurs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    // Material
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatPaginatorModule,
    MatSortModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './admin-administrateurs.component.html',
  styleUrls: ['./admin-administrateurs.component.scss'],
})
export class AdminAdministrateursComponent implements OnInit {
  // TODO: déporter ceci vers environment.ts
  private readonly API = 'http://192.168.11.124:8080';

  admins = new MatTableDataSource<Utilisateur>([]);
  displayedColumns = ['nom', 'prenom', 'numero', 'actions'];

  // UI state
  loadingList = false;
  loadingSubmit = false;
  search = '';

  form: FormGroup;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      nomUtilisateur: ['', [Validators.required, Validators.minLength(2)]],
      prenomUtilisateur: ['', [Validators.required, Validators.minLength(2)]],
      numeroUtilisateur: [
        '',
        [
          Validators.required,
          // formats Burkina (avec/ss +226), 8 chiffres
          Validators.pattern(/^(\+226|00226|226)?[0-9]{8}$/),
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    this.configureFilter();
    this.loadAdmins();
  }

  // Ajoutez ces méthodes dans votre classe AdminAdministrateursComponent

getActiveAdmins(): number {
  return this.admins.data.length; // Pour l'instant, tous les admins sont considérés comme actifs
}

resetForm(): void {
  this.form.reset();
  this.form.markAsPristine();
  this.form.markAsUntouched();
}

private async showConfirmationDialog(): Promise<boolean> {
  // Vous pouvez remplacer cela par un dialog Material plus joli
  return confirm('Êtes-vous sûr de vouloir supprimer cet administrateur ? Cette action est irréversible.');
}

  private configureFilter() {
    this.admins.filterPredicate = (row, filter) => {
      const term = filter.trim().toLowerCase();
      const fullName =
        `${row.prenomUtilisateur ?? ''} ${row.nomUtilisateur ?? ''}`.toLowerCase();
      const numero = (row.numeroUtilisateur ?? '').toLowerCase();
      return (
        fullName.includes(term) ||
        numero.includes(term)
      );
    };
  }

  // ---------- API ----------
  loadAdmins() {
    this.loadingList = true;
    this.http.get<Utilisateur[]>(`${this.API}/utilisateurs`).subscribe({
      next: (data) => {
        const onlyAdmins =
          (data ?? []).filter((u) => u.roles?.some((r) => r.name === 'ADMIN')) ?? [];
        this.admins.data = onlyAdmins;
        this.admins.paginator = this.paginator;
        this.admins.sort = this.sort;
        this.loadingList = false;
      },
      error: (err) => {
        this.loadingList = false;
        this.notify("Erreur lors du chargement des administrateurs.");
        console.error(err);
      },
    });
  }

  ajouterAdmin() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify('Veuillez corriger les champs du formulaire.');
      return;
    }
    this.loadingSubmit = true;

    const v = this.form.value;
    const formData = new FormData();
    formData.append('nomUtilisateur', v.nomUtilisateur);
    formData.append('prenomUtilisateur', v.prenomUtilisateur);
    formData.append('numeroUtilisateur', v.numeroUtilisateur);
    formData.append('password', v.password);
    formData.append('role', 'ADMIN');

    this.http.post(`${this.API}/utilisateurs`, formData).subscribe({
      next: () => {
        this.loadingSubmit = false;
        this.form.reset();
        this.notify('Administrateur ajouté avec succès.', 'OK');
        this.loadAdmins();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingSubmit = false;
        const msg =
          (err?.error?.message as string) ||
          'Erreur lors de l’ajout de l’administrateur.';
        this.notify(msg);
        console.error(err);
      },
    });
  }

  supprimer(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer cet administrateur ?')) return;
    this.http.delete(`${this.API}/utilisateurs/${id}`).subscribe({
      next: () => {
        this.notify('Administrateur supprimé.');
        this.loadAdmins();
      },
      error: (err) => {
        const msg =
          (err?.error?.message as string) || 'Suppression impossible.';
        this.notify(msg);
        console.error(err);
      },
    });
  }

  // ---------- Helpers ----------
  applySearch() {
    this.admins.filter = this.search.trim().toLowerCase();
    if (this.admins.paginator) this.admins.paginator.firstPage();
  }

  get f(): { [k: string]: AbstractControl } {
    return this.form.controls;
  }

  private notify(message: string, action: string = 'Fermer') {
    this.snack.open(message, action, { duration: 3000 });
  }
}
