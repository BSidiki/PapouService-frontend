import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Retrait, TransactionState } from '../models';

@Injectable({ providedIn: 'root' })
export class RetraitService {
  private readonly API = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Retrait[]> {
    return this.http.get<Retrait[]>(`${this.API}/retraits`);
  }

  getById(id: number): Observable<Retrait> {
    return this.http.get<Retrait>(`${this.API}/retraits/${id}`);
  }

  create(userId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.API}/retraits/user/${userId}`, formData);
  }

  createInvite(formData: FormData): Observable<any> {
    return this.http.post(`${this.API}/invites/retraits`, formData);
  }

  updateState(userId: number, id: number, state: TransactionState, motifRejet?: string): Observable<any> {
    const params = motifRejet ? `?motifRejet=${encodeURIComponent(motifRejet)}` : '';
    return this.http.put(`${this.API}/retraits/${userId}/${id}/${state}${params}`, {});
  }

  updateStateInvite(id: number, state: TransactionState, motifRejet?: string): Observable<any> {
    const params = motifRejet ? `?motifRejet=${encodeURIComponent(motifRejet)}` : '';
    return this.http.put(`${this.API}/retraits/0/${id}/${state}${params}`, {});
  }

  /** Parse un codeRetrait encodé "CODE||REF||caisse" → { code, ref } */
  parseCode(raw?: string | null): { code: string; ref: string } {
    if (!raw) return { code: '', ref: '' };
    const idx = raw.indexOf('||REF||');
    if (idx === -1) return { code: raw, ref: '' };
    return { code: raw.substring(0, idx), ref: raw.substring(idx + 7) };
  }
}
