import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderPublicComponent } from "../../layout/header-public/header-public.component";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { FooterComponent } from "../../layout/footer/footer.component";

@Component({
  selector: 'app-cotes-sportives.component',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    HeaderPublicComponent,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
    FooterComponent
],
  templateUrl: './cotes-sportives.component.html',
  styleUrls: ['./cotes-sportives.component.scss']
})
export class CotesSportivesComponent implements OnInit {
[x: string]: any;
  matchs: any[] = [];
  loading = true;
selectedSport: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Simuler une requête API avec des données de test
    setTimeout(() => {
      this.matchs = [
        {
          equipe1: 'Manchester City',
          equipe2: 'Real Madrid',
          cote1: 2.10,
          coteN: 3.20,
          cote2: 2.80,
          date: '2025-07-05T20:00:00Z'
        },
        {
          equipe1: 'PSG',
          equipe2: 'Bayern Munich',
          cote1: 2.50,
          coteN: 3.10,
          cote2: 2.30,
          date: '2025-07-06T21:00:00Z'
        },
        {
          equipe1: 'Chelsea',
          equipe2: 'Juventus',
          cote1: 1.95,
          coteN: 3.30,
          cote2: 3.20,
          date: '2025-07-07T19:30:00Z'
        }
      ];
      this.loading = false;
    }, 1000);
  }

  formatDate(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
  }
}
