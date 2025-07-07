// src/app/services/odds.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OddsService {
  private API_KEY = '452cd0e0aa64dfa6585ffbba331b193d';
  private BASE_URL = 'https://api.the-odds-api.com/v4/sports';

  constructor(private http: HttpClient) {}

  getSports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}`, {
      params: new HttpParams().set('apiKey', this.API_KEY)
    });
  }

  getOdds(sport: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/${sport}/odds`, {
      params: new HttpParams()
        .set('apiKey', this.API_KEY)
        .set('regions', 'eu') // ou 'us' selon votre cible
        .set('markets', 'h2h,spreads,totals')
        .set('oddsFormat', 'decimal')
    });
  }
}
