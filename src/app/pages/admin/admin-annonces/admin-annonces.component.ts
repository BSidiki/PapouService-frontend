import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-annonces',
  templateUrl: './admin-annonces.component.html',
  styleUrls: ['./admin-annonces.component.scss'],
  standalone: true,
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
    MatToolbarModule
  ]
})
export class AdminAnnoncesComponent implements OnInit {
  displayedColumns: string[] = ['media', 'titre', 'texte', 'actions'];
  dataSource = new MatTableDataSource<any>();
  @ViewChild(MatSort) sort!: MatSort;

  search = '';
  annonceForm!: FormGroup;
  selectedImage!: File | null;
  isEditing = false;
  editId: number | null = null;

  constructor(private http: HttpClient, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadAnnonces();
    this.annonceForm = this.fb.group({
      titre: [''],
      texte: [''],
      media: [null],
    });
  }

  loadAnnonces() {
    this.http.get<any[]>('http://192.168.11.100:8080/annonces').subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.sort = this.sort;
      },
      error: () => alert('Erreur chargement des annonces'),
    });
  }

  applyFilter() {
    this.dataSource.filter = this.search.trim().toLowerCase();
  }

  onFileSelected(event: any) {
    this.selectedImage = event.target.files[0];
  }

  toBase64(media: any): string {
    return 'data:image/jpeg;base64,' + media;
  }

  onSubmit() {
    if (this.isEditing && !this.editId) {
      alert("ID manquant pour la modification !");
      return;
    }

    const formData = new FormData();
    formData.append('titre', this.annonceForm.value.titre);
    formData.append('texte', this.annonceForm.value.texte);
    if (this.selectedImage) {
      formData.append('media', this.selectedImage);
    }

    const request = this.isEditing
      ? this.http.put(`http://192.168.11.100:8080/annonces/${this.editId}`, formData)
      : this.http.post('http://192.168.11.100:8080/annonces', formData);

    request.subscribe({
      next: () => {
        this.loadAnnonces();
        this.annonceForm.reset();
        this.selectedImage = null;
        this.isEditing = false;
        this.editId = null;
      },
      error: (err) => {
        console.error(err);
        alert("Échec de l'enregistrement ou de la modification");
      }
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.editId = null;
    this.annonceForm.reset();
    this.selectedImage = null;
  }

  editAnnonce(annonce: any) {
    this.isEditing = true;
    this.editId = annonce.idAnnonce; // ✅ correct car l'API renvoie "idAnnonce"
    this.annonceForm.patchValue({
      titre: annonce.titre,
      texte: annonce.texte,
    });
  }


  deleteAnnonce(id: number | undefined) {
    if (!id) {
      alert("ID de l'annonce introuvable");
      return;
    }

    if (!confirm('Supprimer cette annonce ?')) return;

    this.http.delete(`http://192.168.11.100:8080/annonces/${id}`).subscribe({
      next: () => this.loadAnnonces(),
      error: () => alert('Erreur suppression'),
    });
  }
}
