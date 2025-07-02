import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-admin-pubs',
  templateUrl: './admin-pubs.component.html',
  styleUrls: ['./admin-pubs.component.scss'],
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
    MatToolbarModule,
  ]
})
export class AdminPubsComponent implements OnInit {
  pubForm!: FormGroup;
  selectedFile!: File | null;
  dataSource = new MatTableDataSource<any>();
  displayedColumns = ['fichier', 'actions'];
  isEditing = false;
  editId: number | null = null;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadPubs();
    this.pubForm = this.fb.group({});
  }

  loadPubs() {
    this.http.get<any[]>('http://192.168.244.230:8080/pubs').subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.sort = this.sort;
      },
      error: () => alert("Erreur lors du chargement des pubs"),
    });
  }

  toBase64(fichier: any): string {
    return 'data:image/jpeg;base64,' + fichier;
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onSubmit() {
    const formData = new FormData();
    if (this.selectedFile) formData.append('fichier', this.selectedFile);

    const request = this.isEditing
      ? this.http.put(`http://192.168.244.230:8080/pubs/${this.editId}`, formData)
      : this.http.post('http://192.168.244.230:8080/pubs', formData);

    request.subscribe({
      next: () => {
        this.loadPubs();
        this.pubForm.reset();
        this.selectedFile = null;
        this.isEditing = false;
        this.editId = null;
      },
      error: () => alert("Erreur lors de l'enregistrement"),
    });
  }

  editPub(pub: any) {
    this.isEditing = true;
    this.editId = pub.id;
    alert("Sélectionnez un nouveau fichier pour modifier.");
  }

  deletePub(id: number) {
    if (!confirm("Supprimer cette publicité ?")) return;
    this.http.delete(`http://192.168.244.230:8080/pubs/${id}`).subscribe({
      next: () => this.loadPubs(),
      error: () => alert("Erreur lors de la suppression"),
    });
  }
}
