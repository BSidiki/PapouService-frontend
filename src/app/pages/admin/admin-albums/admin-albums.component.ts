import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-admin-albums',
  standalone: true,
  templateUrl: './admin-albums.component.html',
  styleUrls: ['./admin-albums.component.scss'],
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
]
})
export class AdminAlbumsComponent implements OnInit {
  albumForm!: FormGroup;
  search = '';
  isEditing = false;
  editId: number | null = null;
  selectedFiles: File[] = [];

  displayedColumns: string[] = ['nom', 'media', 'actions'];
  dataSource = new MatTableDataSource<any>();
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.albumForm = this.fb.group({ nom: [''] });
    this.loadAlbums();
  }

  loadAlbums() {
    this.http.get<any[]>('http://192.168.57.230:8080/albums').subscribe(data => {
      this.dataSource.data = data;
      this.dataSource.sort = this.sort;
    });
  }

  applyFilter() {
    this.dataSource.filter = this.search.trim().toLowerCase();
  }


  toBase64(file: any): string {
    return 'data:image/jpeg;base64,' + file;
  }

  onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    this.selectedFiles = files.length > 0 ? [files[0]] : [];
  }

  onSubmit() {
    const formData = new FormData();
    formData.append('type_contenue', this.albumForm.value.nom); // ⚠️ correspond à AlbumRequestDTO
    if (this.selectedFiles[0]) {
      formData.append('bytes', this.selectedFiles[0]); // ⚠️ correspond à @RequestParam("bytes")
    }

    const request = this.isEditing
      ? this.http.put(`http://192.168.57.230:8080/albums/${this.editId}`, formData)
      : this.http.post('http://192.168.57.230:8080/albums', formData);

    request.subscribe({
      next: () => {
        this.loadAlbums();
        this.albumForm.reset();
        this.selectedFiles = [];
        this.isEditing = false;
        this.editId = null;
      },
      error: () => alert("Erreur lors de l'enregistrement de l'album")
    });
  }


  editAlbum(album: any) {
    this.isEditing = true;
    this.editId = album.id;
    this.albumForm.patchValue({ nom: album.nom });
  }

  deleteAlbum(id: number) {
    if (confirm('Supprimer cet album ?')) {
      this.http.delete(`http://192.168.57.230:8080/albums/${id}`).subscribe(() => this.loadAlbums());
    }
  }
}
