import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OddsService {
  private readonly API_KEY = environment.oddsApiKey;
  private readonly BASE_URL = 'https://api.the-odds-api.com/v4/sports';

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
        .set('markets', 'h2h')
        .set('oddsFormat', 'decimal')
    });
  }
}
