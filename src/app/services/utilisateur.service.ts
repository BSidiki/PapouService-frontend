import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Utilisateur, Depot, Retrait } from '../models';

@Injectable({ providedIn: 'root' })
export class UtilisateurService {
  private readonly API = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(`${this.API}/utilisateurs`);
  }

  getById(id: number): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.API}/utilisateurs/getuser/${id}`);
  }

  create(data: any, headers?: HttpHeaders): Observable<any> {
    const options = headers ? { headers } : {};
    return this.http.post(`${this.API}/utilisateurs`, data, options);
  }

  update(id: number, data: Partial<Utilisateur>): Observable<Utilisateur> {
    let params = new HttpParams();
    if (data.nomUtilisateur)    params = params.set('nomUtilisateur',    data.nomUtilisateur);
    if (data.prenomUtilisateur) params = params.set('prenomUtilisateur', data.prenomUtilisateur);
    if (data.numeroUtilisateur) params = params.set('numeroUtilisateur', data.numeroUtilisateur);
    if (data.id_1XBET)          params = params.set('id_1XBET',          data.id_1XBET);
    if (data.id_BETWINNER)      params = params.set('id_BETWINNER',      data.id_BETWINNER);
    if (data.id_MELBET)         params = params.set('id_MELBET',         data.id_MELBET);
    if (data.id_888STARZ)       params = params.set('id_888STARZ',       data.id_888STARZ);
    return this.http.put<Utilisateur>(`${this.API}/utilisateurs/update/${id}`, null, { params });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.API}/utilisateurs/delete/${id}`, { responseType: 'text' as 'json' });
  }

  changePassword(userId: number, data: { ancienPassword: string; nouveauPassword: string; confirmPassword: string }): Observable<any> {
    const params = new HttpParams()
      .set('ancienPassword', data.ancienPassword)
      .set('nouveauPassword', data.nouveauPassword)
      .set('confirmPassword', data.confirmPassword);
    return this.http.put(`${this.API}/utilisateurs/${userId}/change-password`, null, { params, responseType: 'text' as 'json' });
  }

  genererCodePromo(userId: number): Observable<{ codePromo: string }> {
    return this.http.post<{ codePromo: string }>(`${this.API}/utilisateurs/${userId}/generer-code-promo`, {});
  }

  validerCodePromo(code: string): Observable<{ valide: boolean }> {
    return this.http.get<{ valide: boolean }>(`${this.API}/promo/valider`, { params: { code } });
  }

  getFilleuls(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/utilisateurs/${userId}/filleuls`);
  }

  getCommissions(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/utilisateurs/${userId}/commissions`);
  }

  retraitCommission(userId: number, data: { numeroMobile: string; pays: string; modePaiement: string }): Observable<any> {
    const params = new HttpParams()
      .set('numeroMobile', data.numeroMobile)
      .set('pays', data.pays)
      .set('modePaiement', data.modePaiement);
    return this.http.post(`${this.API}/utilisateurs/${userId}/retrait-commission`, null, { params });
  }

  getParrain(userId: number): Observable<any> {
    return this.http.get<any>(`${this.API}/utilisateurs/${userId}/parrain`);
  }

  getHistoriques(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/utilisateurs/${userId}/historiques`);
  }

  getDepots(userId: number): Observable<Depot[]> {
    return this.http.get<Depot[]>(`${this.API}/utilisateurs/${userId}/listDepots`);
  }

  getRetraits(userId: number): Observable<Retrait[]> {
    return this.http.get<Retrait[]>(`${this.API}/utilisateurs/${userId}/listRetraits`);
  }

  getTauxCommission(): Observable<{ tauxCommission: number }> {
    return this.http.get<{ tauxCommission: number }>(`${this.API}/configurations/taux-commission`);
  }

  setTauxCommission(valeur: number): Observable<any> {
    const params = new HttpParams().set('valeur', valeur.toString());
    return this.http.put(`${this.API}/configurations/taux-commission`, null, { params, responseType: 'text' as 'json' });
  }
}
