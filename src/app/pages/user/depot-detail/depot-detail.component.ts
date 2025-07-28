import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Location } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-depot-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule ],
  templateUrl: './depot-detail.component.html',
  styleUrls: ['./depot-detail.component.scss']
})
export class DepotDetailComponent implements OnInit {
  depot: any;
  zoomed = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get(`http://192.168.57.230:8080/depots/${id}`).subscribe({
      next: (data: any) => {
        this.depot = data;
        this.motif = data.motifRejet || ''; // 🔄 Assurez-vous que le backend renvoie ça, sinon on le simulera plus tard
      },
      error: (err) => {
        console.error(err);
        alert("Erreur lors du chargement du dépôt");
      }
    });
  }

  motif: string = '';

  toBase64(media: any): string {
    return 'data:image/jpeg;base64,' + media;
  }

  goBack() {
    this.location.back();
  }

  changerStatut(nouveauStatut: 'VALIDATED' | 'REJECTED') {
    this.http.put(`http://192.168.57.230:8080/depots/0/${this.depot.idDepot}/${nouveauStatut}`, {})
      .subscribe({
        next: () => {
          this.depot.transactionState = nouveauStatut;
          alert(`Dépôt ${nouveauStatut === 'VALIDATED' ? 'validé' : 'rejeté'} avec succès`);
        },
        error: () => {
          alert("Erreur lors du changement de statut");
        }
      });
  }

  toggleZoom() {
    this.zoomed = !this.zoomed;
  }
  get zoomClass() {
    return this.zoomed ? 'zoomed' : '';
  }

  getIdPlateforme(depot: any): string {
    const utilisateur = depot.utilisateur;
    const plateforme = depot.optionDeTransaction;

    switch (plateforme) {
      case 'IXBET': return utilisateur?.id_1XBET;
      case 'BETWINNER': return utilisateur?.id_BETWINNER;
      case 'MELBET': return utilisateur?.id_MELBET;
      case 'IWIN': return utilisateur?.id_1WIN;
      case 'STARZ': return utilisateur?.id_888STARZ;
      default: return 'Inconnu';
    }
  }


}
