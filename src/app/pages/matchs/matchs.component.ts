import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { OddsService } from '../../services/odds.service';
import { catchError, of } from 'rxjs';

interface Match {
  ligue: string;
  date: string;
  equipe1: string;
  equipe2: string;
  bookmaker: string;
  cotes: { c1: number | null; n: number | null; c2: number | null };
}

const LEAGUES: { key: string; label: string }[] = [
  { key: 'soccer_epl',              label: 'Premier League' },
  { key: 'soccer_spain_la_liga',    label: 'La Liga' },
  { key: 'soccer_france_ligue_one', label: 'Ligue 1' },
  { key: 'soccer_italy_serie_a',    label: 'Serie A' },
  { key: 'soccer_germany_bundesliga', label: 'Bundesliga' },
  { key: 'soccer_uefa_champs_league', label: 'Champions League' },
];

@Component({
  selector: 'app-matchs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatSelectModule, MatFormFieldModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './matchs.component.html',
  styleUrls: ['./matchs.component.scss']
})
export class MatchsComponent implements OnInit {
  leagues = LEAGUES;
  selectedLeague = LEAGUES[0].key;
  matchs: Match[] = [];
  loading = false;
  error = '';

  constructor(private oddsService: OddsService) {}

  ngOnInit(): void {
    this.loadMatchs();
  }

  loadMatchs(): void {
    this.loading = true;
    this.error = '';
    this.matchs = [];

    this.oddsService.getOdds(this.selectedLeague)
      .pipe(catchError(() => of(null)))
      .subscribe(data => {
        this.loading = false;
        if (!data) {
          this.error = 'Impossible de charger les matchs. Vérifiez votre connexion.';
          return;
        }
        this.matchs = this.transformOdds(data);
      });
  }

  private transformOdds(data: any[]): Match[] {
    const ligueName = this.leagues.find(l => l.key === this.selectedLeague)?.label ?? '';

    return data
      .filter(m => m.bookmakers?.length > 0)
      .map(m => {
        const bookmaker = m.bookmakers[0];
        const h2h = bookmaker?.markets?.find((mk: any) => mk.key === 'h2h');
        const outcomes: any[] = h2h?.outcomes ?? [];

        const home = outcomes.find((o: any) => o.name === m.home_team);
        const away = outcomes.find((o: any) => o.name === m.away_team);
        const draw = outcomes.find((o: any) => o.name === 'Draw');

        return {
          ligue: ligueName,
          date: this.formatDate(m.commence_time),
          equipe1: m.home_team,
          equipe2: m.away_team,
          bookmaker: bookmaker?.title ?? '',
          cotes: {
            c1: home?.price ?? null,
            n:  draw?.price ?? null,
            c2: away?.price ?? null,
          }
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
