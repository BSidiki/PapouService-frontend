import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule } from '@angular/material/paginator';

type Annonce = {
  idAnnonce: number;
  titre: string;
  texte: string;
  media?: string;
};

@Component({
  selector: 'app-admin-annonces',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
    MatPaginatorModule
  ],
  templateUrl: './admin-annonces.component.html',
  styleUrls: ['./admin-annonces.component.scss']
})
export class AdminAnnoncesComponent implements OnInit {
  private readonly API = 'http://192.168.11.124:8080';

  displayedColumns: string[] = ['media', 'titre', 'texte', 'actions'];
  dataSource = new MatTableDataSource<Annonce>([]);
  @ViewChild(MatSort) sort!: MatSort;

  search = '';
  form!: FormGroup;
  selectedFile: File | null = null;
  zoomedImage: string | null = null;

  isEditing = false;
  editingId: number | null = null;
  editingAnnonce: Annonce | null = null;

  loading = false;

  constructor(private http: HttpClient, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(200)]],
      texte: ['', [Validators.required, Validators.maxLength(4000)]],
      media: [null]
    });
    this.load();
  }

  // -------- API --------
  load(): void {
    this.loading = true;
    this.http.get<Annonce[]>(`${this.API}/annonces`).subscribe({
      next: (data) => {
        this.dataSource.data = data ?? [];
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notify('Erreur lors du chargement des annonces', 'error');
      }
    });
  }

  create(): void {
    this.loading = true;
    const fd = new FormData();
    fd.append('titre', this.form.value.titre);
    fd.append('texte', this.form.value.texte);
    if (this.selectedFile) fd.append('media', this.selectedFile);

    this.http.post(`${this.API}/annonces`, fd).subscribe({
      next: () => {
        this.resetForm();
        this.load();
        this.notify('Annonce créée avec succès', 'success');
      },
      error: () => {
        this.loading = false;
        this.notify("Échec de l'ajout de l'annonce", 'error');
      }
    });
  }

  async updateWithFallback(): Promise<void> {
    if (!this.editingId) return;
    this.loading = true;

    const fd = new FormData();
    fd.append('titre', this.form.value.titre);
    fd.append('texte', this.form.value.texte);
    if (this.selectedFile) fd.append('media', this.selectedFile);

    try {
      const resp = await fetch(`${this.API}/annonces/${this.editingId}`, {
        method: 'PUT',
        body: fd
      });

      if (resp.ok) {
        this.resetForm();
        this.load();
        this.notify('Annonce modifiée avec succès', 'success');
        return;
      }

      if (resp.status === 415 || (resp.status >= 400 && resp.status < 500)) {
        await this.replaceByDeleteCreate(this.editingId!, fd);
        return;
      }

      this.loading = false;
      this.notify("Échec de la modification (serveur).", 'error');
    } catch {
      await this.replaceByDeleteCreate(this.editingId!, fd);
    }
  }

  private async replaceByDeleteCreate(id: number, fd: FormData) {
    try {
      await fetch(`${this.API}/annonces/${id}`, { method: 'DELETE' });
      const resp = await fetch(`${this.API}/annonces`, { method: 'POST', body: fd });
      if (!resp.ok) throw new Error();
      this.resetForm();
      this.load();
      this.notify('Annonce modifiée avec succès (méthode alternative)', 'success');
    } catch {
      this.loading = false;
      this.notify("Fallback échec: impossible de remplacer l'annonce.", 'error');
    }
  }

  delete(id: number | undefined) {
    if (!id) return;

    const confirmation = confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?');
    if (!confirmation) return;

    this.http.delete(`${this.API}/annonces/${id}`).subscribe({
      next: () => {
        this.load();
        this.notify('Annonce supprimée avec succès', 'success');
      },
      error: () => {
        this.notify('Erreur lors de la suppression', 'error');
      }
    });
  }

  // -------- UI --------
  applyFilter() {
    this.dataSource.filter = (this.search || '').trim().toLowerCase();
  }

  applySearch() {
    this.applyFilter();
  }

  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      // Vérifier la taille du fichier (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.notify('Le fichier est trop volumineux (max 5MB)', 'error');
        return;
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        this.notify('Veuillez sélectionner une image valide', 'error');
        return;
      }

      this.selectedFile = file;
    }
  }

  getPreviewImage(): string {
    if (this.selectedFile) {
      return URL.createObjectURL(this.selectedFile);
    }
    if (this.isEditing && this.editingAnnonce?.media) {
      return this.toBase64(this.editingAnnonce.media);
    }
    return '';
  }

  removeImage() {
    this.selectedFile = null;
    // Réinitialiser l'input file
    const fileInput = document.getElementById('mediaUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  startEdit(annonce: Annonce) {
    this.isEditing = true;
    this.editingId = annonce.idAnnonce;
    this.editingAnnonce = annonce;
    this.form.patchValue({
      titre: annonce.titre,
      texte: annonce.texte
    });
    this.selectedFile = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.resetForm();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    if (this.isEditing) {
      this.updateWithFallback();
    } else {
      this.create();
    }
  }

  resetForm() {
    this.isEditing = false;
    this.editingId = null;
    this.editingAnnonce = null;
    this.selectedFile = null;
    this.form.reset();

    // Réinitialiser l'input file
    const fileInput = document.getElementById('mediaUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  toBase64(media: any): string {
    return 'data:image/jpeg;base64,' + media;
  }

  // Image Zoom functionality
  openImageZoom(imageSrc: string) {
    this.zoomedImage = imageSrc;
    document.body.style.overflow = 'hidden'; // Empêcher le scroll
  }

  closeImageZoom() {
    this.zoomedImage = null;
    document.body.style.overflow = ''; // Rétablir le scroll
  }

  // Stats methods
  getAnnoncesWithImages(): number {
    return this.dataSource.data.filter(annonce => annonce.media).length;
  }

  nowLabel(): string {
    const d = new Date();
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR');
  }

  private notify(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Utiliser alert pour l'instant, vous pouvez remplacer par un service de notification
    if (type === 'error') {
      alert('❌ ' + message);
    } else if (type === 'success') {
      alert('✅ ' + message);
    } else {
      alert('ℹ️ ' + message);
    }
  }
}
