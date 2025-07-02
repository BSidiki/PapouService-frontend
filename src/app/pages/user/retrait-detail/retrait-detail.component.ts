import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Location } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-retrait-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule ],
  templateUrl: './retrait-detail.component.html',
  styleUrls: ['./retrait-detail.component.scss']
})
export class RetraitDetailComponent implements OnInit {
  retrait: any;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get(`http://192.168.244.230:8080/retraits/${id}`).subscribe({
      next: (data) => {
        console.log('Retrait:', data);
        this.retrait = data;
      },
      error: (err) => {
        console.error(err);
        alert("Erreur lors du chargement du retrait");
      }
    });
  }
  /**
   * Convertit une image en base64 pour l'affichage.
   * @param media L'image à convertir.
   * @returns La chaîne de caractères base64 de l'image.
   */

  toBase64(media: any): string {
    return 'data:image/jpeg;base64,' + media;
  }

  goBack() {
    this.location.back();
  }
}
