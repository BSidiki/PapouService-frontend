import { ErrorService } from '../../../services/error.service';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule } from '@angular/material/paginator';
import { environment } from '../../../../environments/environment';

type PubType = 'IMAGE' | 'VIDEO_FICHIER' | 'VIDEO_LIEN';

type Pub = {
  id?: number;
  idPub?: number;
  idPublicite?: number;
  fichier?: string | number[] | null;
  typePub?: PubType;
  lien?: string | null;
};

@Component({
  selector: 'app-admin-pubs',
  standalone: true,
  templateUrl: './admin-pubs.component.html',
  styleUrls: ['./admin-pubs.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatSortModule,
    MatDialogModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule
  ]
})
export class AdminPubsComponent implements OnInit, AfterViewInit {
  private readonly API = environment.apiBaseUrl;

  pubForm!: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  zoomedImage: string | null = null;
  zoomLevel: number = 1;

  typePub: PubType = 'IMAGE';
  lienVideo = '';

  dataSource = new MatTableDataSource<Pub>([]);
  displayedColumns = ['fichier', 'actions'];
  search: string = '';

  isEditing = false;
  editId: number | null = null;
  editingPub: Pub | null = null;
  loading = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator) {
    if (p) { this.dataSource.paginator = p; }
  }

  constructor(private http: HttpClient, private fb: FormBuilder, private sanitizer: DomSanitizer, private errorService: ErrorService) {}

  ngOnInit(): void {
    this.pubForm = this.fb.group({});
    this.loadPubs();
  }

  ngAfterViewInit(): void {
    setTimeout(() => (this.dataSource.sort = this.sort));
  }

  public getId(pub: Pub): number | undefined {
    return pub.id ?? pub.idPub ?? pub.idPublicite;
  }

  loadPubs() {
    this.loading = true;
    this.http.get<Pub[]>(`${this.API}/pubs`).subscribe({
      next: (data) => {
        this.dataSource.data = data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notify('Erreur lors du chargement des publicités', 'error');
      },
    });
  }

  toVideoBase64(data: string | number[] | null | undefined): string {
    if (!data) return '';
    if (typeof data === 'string') return 'data:video/mp4;base64,' + data.trim();
    const arr = Array.isArray(data) ? data : [];
    if (!arr.length) return '';
    const bytes = new Uint8Array(arr);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'data:video/mp4;base64,' + btoa(bin);
  }

  toBase64(fichier: string | number[] | null | undefined): string {
    if (!fichier) return '';
    if (typeof fichier === 'string') {
      const trimmed = fichier.trim();
      return trimmed ? 'data:image/jpeg;base64,' + trimmed : '';
    }
    const arr = Array.isArray(fichier) ? fichier : [];
    if (arr.length === 0) return '';
    const bytes = new Uint8Array(arr);
    const bin = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    return 'data:image/jpeg;base64,' + btoa(bin);
  }

  onTypeChange(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.lienVideo = '';
    const fileInput = document.getElementById('pubUpload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    if (this.typePub === 'VIDEO_FICHIER') {
      const isVideo = /^video\/(mp4|webm|ogg)$/i.test(file.type);
      if (!isVideo) { this.notify('Format vidéo non supporté. Utilisez MP4, WebM ou OGG.', 'error'); return; }
      if (file.size > 50 * 1024 * 1024) { this.notify('Fichier trop volumineux (maximum 50 Mo).', 'error'); return; }
      this.selectedFile = file;
      this.previewUrl = URL.createObjectURL(file);
      return;
    }

    const isImage = /^image\/(png|jpe?g|webp|gif)$/i.test(file.type);
    if (!isImage) { this.notify('Format non supporté. Utilisez PNG, JPG, WebP ou GIF.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { this.notify('Fichier trop volumineux (maximum 5 Mo).', 'error'); return; }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => this.previewUrl = reader.result as string;
    reader.readAsDataURL(file);
  }

  private buildFormData(): FormData {
    const fd = new FormData();
    fd.append('typePub', this.typePub);
    if (this.typePub === 'VIDEO_LIEN') {
      fd.append('lien', this.lienVideo.trim());
    } else if (this.selectedFile) {
      fd.append('fichier', this.selectedFile);
      fd.append('file', this.selectedFile);
    }
    return fd;
  }

  onSubmit() {
    if (this.typePub === 'VIDEO_LIEN' && !this.lienVideo.trim()) {
      this.notify('Veuillez saisir l\'URL de la vidéo.', 'error');
      return;
    }
    if (this.typePub !== 'VIDEO_LIEN' && !this.selectedFile && !this.isEditing) {
      this.notify('Veuillez sélectionner un fichier.', 'error');
      return;
    }

    this.loading = true;
    const formData = this.buildFormData();

    const req$ = this.isEditing
      ? this.http.put(`${this.API}/pubs/${this.editId}`, formData)
      : this.http.post(`${this.API}/pubs`, formData);

    req$.subscribe({
      next: () => {
        this.resetForm();
        this.loadPubs();
        this.notify(
          this.isEditing ? 'Publicité modifiée avec succès' : 'Publicité ajoutée avec succès',
          'success'
        );
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 415) {
          this.notify('Erreur: Type de média non supporté. Contactez l\'administrateur.', 'error');
        } else {
          this.notify("Erreur lors de l'enregistrement.", 'error');
        }
      }
    });
  }

  editPub(pub: Pub) {
    this.isEditing = true;
    this.editId = this.getId(pub) ?? null;
    this.editingPub = pub;
    this.previewUrl = null;
    this.selectedFile = null;
    this.typePub = pub.typePub ?? 'IMAGE';
    this.lienVideo = pub.lien ?? '';

    this.notify('Modifiez les champs puis sauvegardez', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  removeImage() {
    this.selectedFile = null;
    this.previewUrl = null;
    const fileInput = document.getElementById('pubUpload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  cancelEdit() {
    this.resetForm();
  }

  deletePub(id: number | undefined) {
    if (!id) {
      this.notify("ID introuvable.", 'error');
      return;
    }

    const confirmation = confirm('Êtes-vous sûr de vouloir supprimer cette publicité ?');
    if (!confirmation) return;

    this.http.delete(`${this.API}/pubs/${id}`).subscribe({
      next: () => {
        this.loadPubs();
        this.notify('Publicité supprimée avec succès', 'success');
      },
      error: () => {
        this.notify('Erreur lors de la suppression', 'error');
      },
    });
  }

  // Image Zoom functionality
  openImageZoom(imageSrc: string) {
    if (!imageSrc || !/^data:image\/|^https?:\/\//i.test(imageSrc)) return;
    this.zoomedImage = imageSrc;
    this.zoomLevel = 1;
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.updateZoom(), 0); // seulement si tu veux forcer un premier recalcul
  }

  closeImageZoom() {
    this.zoomedImage = null;
    this.zoomLevel = 1;
    document.body.style.overflow = '';
  }

  zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel + 0.25, 3);
    this.updateZoom();
  }

  zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.5);
    this.updateZoom();
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.updateZoom();
  }

  private updateZoom() {
    const image = document.querySelector('.zoomed-image') as HTMLElement;
    if (image) {
      image.style.transform = `scale(${this.zoomLevel})`;
    }
  }

  getYoutubeEmbedUrl(url: string): SafeResourceUrl {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const embedUrl = match
      ? `https://www.youtube.com/embed/${match[1]}`
      : url;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  // UI Helper methods
  applyFilter() {
    this.dataSource.filter = this.search.trim().toLowerCase();
  }

  getUploadTitle(): string {
    if (this.isEditing) {
      return this.selectedFile ? 'Nouvelle image sélectionnée' : 'Remplacer l\'image actuelle';
    }
    return this.selectedFile ? 'Image sélectionnée' : 'Choisir une image';
  }

  getActivePubs(): number {
    return this.dataSource.data.length;
  }

  getImageSize(pub: Pub): string {
    // Estimation de la taille basée sur la longueur base64
    if (!pub.fichier) return '';

    let base64Length: number;
    if (typeof pub.fichier === 'string') {
      base64Length = pub.fichier.length;
    } else {
      base64Length = pub.fichier.length;
    }

    const sizeInBytes = Math.floor(base64Length * 0.75);
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private resetForm() {
    this.pubForm.reset();
    this.selectedFile = null;
    this.previewUrl = null;
    this.isEditing = false;
    this.editId = null;
    this.editingPub = null;
    this.loading = false;
    this.typePub = 'IMAGE';
    this.lienVideo = '';

    const fileInput = document.getElementById('pubUpload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  private notify(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const duration = type === 'error' ? 5000 : 3000;
    const panelClass = type === 'success' ? ['snack-success'] : type === 'error' ? ['snack-error'] : [];
    this.errorService.info(message);
  }
}

