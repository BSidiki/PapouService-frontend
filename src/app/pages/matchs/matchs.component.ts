// matchs.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-matchs',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './matchs.component.html',
  styleUrls: ['./matchs.component.scss']
})
export class MatchsComponent implements OnInit {
  matchs: any[] = [];

  ngOnInit(): void {
    this.matchs = [
      {
        ligue: 'Premier League',
        date: '2025-07-01 16:00',
        equipe1: 'Arsenal',
        equipe2: 'Chelsea',
        cotes: { c1: 2.3, n: 3.1, c2: 2.7 }
      },
      {
        ligue: 'La Liga',
        date: '2025-07-01 18:00',
        equipe1: 'Real Madrid',
        equipe2: 'Barcelone',
        cotes: { c1: 2.6, n: 3.2, c2: 2.4 }
      },
      {
        ligue: 'Ligue 1',
        date: '2025-07-01 20:00',
        equipe1: 'PSG',
        equipe2: 'Marseille',
        cotes: { c1: 1.8, n: 3.5, c2: 3.9 }
      }
    ];
  }
}
