import { ErrorService } from '../../../services/error.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { UtilisateurService } from '../../../services/utilisateur.service';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Utilisateur } from '../../../models';

@Component({
  selector: 'app-admin-administrateurs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './admin-administrateurs.component.html',
  styleUrls: ['./admin-administrateurs.component.scss'],
})
export class AdminAdministrateursComponent implements OnInit {
  admins = new MatTableDataSource<Utilisateur>([]);
  displayedColumns = ['nom', 'prenom', 'numero', 'actions'];

  loadingList = false;
  loadingSubmit = false;
  search = '';

  form: FormGroup;

  // Edit mode
  editingAdmin: Utilisateur | null = null;
  editForm: FormGroup;

  // Password change
  passwordAdminId: number | null = null;
  passwordForm: FormGroup;
  savingPassword = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator) {
    if (p) {
      this.admins.paginator = p;
      this.admins.sort = this.sort;
    }
  }

  constructor(
    private utilisateurService: UtilisateurService,
    private fb: FormBuilder, private errorService: ErrorService) {
    this.form = this.fb.group({
      nomUtilisateur: ['', [Validators.required, Validators.minLength(2)]],
      prenomUtilisateur: ['', [Validators.required, Validators.minLength(2)]],
      numeroUtilisateur: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(\+226|00226|226)?[0-9]{8}$/),
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.editForm = this.fb.group({
      nomUtilisateur: ['', [Validators.required, Validators.minLength(2)]],
      prenomUtilisateur: ['', [Validators.required, Validators.minLength(2)]],
      numeroUtilisateur: ['', [Validators.required, Validators.pattern(/^(\+226|00226|226)?[0-9]{8}$/)]],
    });

    this.passwordForm = this.fb.group({
      ancienPassword: ['', [Validators.required]],
      nouveauPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.configureFilter();
    this.loadAdmins();
  }

  getActiveAdmins(): number {
    return this.admins.data.length;
  }

  resetForm(): void {
    this.form.reset();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private configureFilter() {
    this.admins.filterPredicate = (row, filter) => {
      const term = filter.trim().toLowerCase();
      const fullName =
        `${row.prenomUtilisateur ?? ''} ${row.nomUtilisateur ?? ''}`.toLowerCase();
      const numero = (row.numeroUtilisateur ?? '').toLowerCase();
      return fullName.includes(term) || numero.includes(term);
    };
  }

  loadAdmins() {
    this.loadingList = true;
    this.utilisateurService.getAll().subscribe({
      next: (data) => {
        this.admins.data = (data ?? []).filter(u => u.roles?.some(r => r.name === 'ADMIN'));
        this.loadingList = false;
      },
      error: (err) => {
        this.loadingList = false;
        this.notify('Erreur lors du chargement des administrateurs.');
      },
    });
  }

  startEdit(admin: Utilisateur): void {
    this.editingAdmin = admin;
    this.editForm.patchValue({
      nomUtilisateur: admin.nomUtilisateur ?? '',
      prenomUtilisateur: admin.prenomUtilisateur ?? '',
      numeroUtilisateur: admin.numeroUtilisateur ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingAdmin = null;
    this.editForm.reset();
  }

  saveEdit(): void {
    if (!this.editingAdmin?.idUtilisateur || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.loadingSubmit = true;
    this.utilisateurService.update(this.editingAdmin.idUtilisateur, this.editForm.value).subscribe({
      next: () => {
        this.loadingSubmit = false;
        this.editingAdmin = null;
        this.editForm.reset();
        this.notify('Administrateur modifié avec succès.', 'OK');
        this.loadAdmins();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingSubmit = false;
        this.notify((err?.error?.message as string) || 'Erreur lors de la modification.');
      },
    });
  }

  startChangePassword(admin: Utilisateur): void {
    this.passwordAdminId = admin.idUtilisateur ?? null;
    this.passwordForm.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelChangePassword(): void {
    this.passwordAdminId = null;
    this.passwordForm.reset();
  }

  savePassword(): void {
    if (!this.passwordAdminId || this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const v = this.passwordForm.value;
    if (v.nouveauPassword !== v.confirmPassword) {
      this.notify('Les mots de passe ne correspondent pas.');
      return;
    }
    this.savingPassword = true;
    this.utilisateurService.changePassword(this.passwordAdminId, v).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordAdminId = null;
        this.passwordForm.reset();
        this.notify('Mot de passe modifié avec succès.', 'OK');
      },
      error: () => {
        this.savingPassword = false;
        this.notify('Erreur lors du changement de mot de passe.');
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

    this.utilisateurService.create(formData).subscribe({
      next: () => {
        this.loadingSubmit = false;
        this.form.reset();
        this.notify('Administrateur ajoute avec succes.', 'OK');
        this.loadAdmins();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingSubmit = false;
        const msg = (err?.error?.message as string) || "Erreur lors de l'ajout de l'administrateur.";
        this.notify(msg);
      },
    });
  }

  supprimer(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer cet administrateur ?')) return;
    this.utilisateurService.delete(id).subscribe({
      next: () => {
        this.notify('Administrateur supprime.');
        this.loadAdmins();
      },
      error: (err: any) => {
        const msg = (err?.error?.message as string) || 'Suppression impossible.';
        this.notify(msg);
      },
    });
  }

  applySearch() {
    this.admins.filter = this.search.trim().toLowerCase();
    if (this.admins.paginator) this.admins.paginator.firstPage();
  }

  get f(): { [k: string]: AbstractControl } { return this.form.controls; }
  get ef(): { [k: string]: AbstractControl } { return this.editForm.controls; }
  get pf(): { [k: string]: AbstractControl } { return this.passwordForm.controls; }

  private notify(message: string, action: string = 'Fermer') {
    this.errorService.info(message);
  }
}
