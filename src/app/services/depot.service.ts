import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Depot, TransactionState } from '../models';

@Injectable({ providedIn: 'root' })
export class DepotService {
  private readonly API = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Depot[]> {
    return this.http.get<Depot[]>(`${this.API}/depots`);
  }

  getById(id: number): Observable<Depot> {
    return this.http.get<Depot>(`${this.API}/depots/${id}`);
  }

  create(userId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.API}/depots/user/${userId}`, formData);
  }

  createInvite(formData: FormData): Observable<any> {
    return this.http.post(`${this.API}/invites/depots`, formData);
  }

  updateState(userId: number, id: number, state: TransactionState, motifRejet?: string): Observable<any> {
    const params = motifRejet ? `?motifRejet=${encodeURIComponent(motifRejet)}` : '';
    return this.http.put(`${this.API}/depots/${userId}/${id}/${state}${params}`, {});
  }

  updateStateInvite(id: number, state: TransactionState, motifRejet?: string): Observable<any> {
    const params = motifRejet ? `?motifRejet=${encodeURIComponent(motifRejet)}` : '';
    return this.http.put(`${this.API}/depots/0/${id}/${state}${params}`, {});
  }
}
