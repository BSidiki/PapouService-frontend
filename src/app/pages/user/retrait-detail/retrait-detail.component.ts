import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Location } from '@angular/common';

@Component({
  selector: 'app-retrait-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule],
  templateUrl: './retrait-detail.component.html',
  styleUrls: ['./retrait-detail.component.scss']
})
export class RetraitDetailComponent implements OnInit {
  retrait: any;
  zoomed = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location
  ) {}

  // ngOnInit(): void {
  //   const id = this.route.snapshot.paramMap.get('id');
  //   this.http.get(`http://192.168.57.230:8080/retraits/${id}`).subscribe({
  //     next: (data) => this.retrait = data,
  //     error: (err) => {
  //       console.error(err);
  //       alert("Erreur lors du chargement du retrait");
  //     }
  //   });
  // }
  motif: string = '';
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get(`http://192.168.57.230:8080/retraits/${id}`).subscribe({
      next: (data: any) => {
        this.retrait = data;
        this.motif = data.motifRejet || ''; // 🔄 Assurez-vous que le backend renvoie ça, sinon on le simulera plus tard
      },
      error: (err) => {
        console.error(err);
        alert("Erreur lors du chargement du retrait");
      }
    });
  }

  toBase64(file: any): string {
    return 'data:image/jpeg;base64,' + file;
  }

  goBack() {
    this.location.back();
  }

  changerStatut(nouveauStatut: 'VALIDATED' | 'REJECTED') {
    this.http.put(`http://192.168.57.230:8080/retraits/0/${this.retrait.idRetrait}/${nouveauStatut}`, {})
      .subscribe({
        next: () => {
          this.retrait.transactionState = nouveauStatut;
          alert(`Retrait ${nouveauStatut === 'VALIDATED' ? 'validé' : 'rejeté'} avec succès`);
        },
        error: () => {
          alert("Erreur lors du changement de statut");
        }
      });
  }

  getIdPlateforme(retrait: any): string {
    const utilisateur = retrait.utilisateur;
    const plateforme = retrait.optionDeTransaction;

    switch (plateforme) {
      case 'IXBET': return utilisateur?.id_1XBET;
      case 'BETWINNER': return utilisateur?.id_BETWINNER;
      case 'MELBET': return utilisateur?.id_MELBET;
      case 'IWIN': return utilisateur?.id_1WIN;
      default: return 'Inconnu';
    }
  }

  toggleZoom() {
    this.zoomed = !this.zoomed;
  }
  get zoomClass() {
    return this.zoomed ? 'zoomed' : '';
  }
}
