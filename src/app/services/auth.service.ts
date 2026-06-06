import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../environments/environment';

export interface AuthUser {
  idUtilisateur: number;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  numeroUtilisateur?: string;
  email?: string;
  codePromo?: string;
  commissionEnAttente?: number;
  id_1XBET?: string;
  id_BETWINNER?: string;
  id_MELBET?: string;
  id_888STARZ?: string;
  roles?: { name: string }[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiBaseUrl;
  private readonly KEY = 'current_user';
  private _user: AuthUser | null = null;

  constructor(public http: HttpClient) {}

  /**
   * Appelé au démarrage via APP_INITIALIZER.
   * Charge l'utilisateur depuis le stockage sécurisé en mémoire.
   */
  async init(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: this.KEY });
      this._user = value ? (JSON.parse(value) as AuthUser) : null;
    } catch {
      this._user = null;
    }
  }

  login(credentials: { numeroUtilisateur: string; password: string }) {
    return this.http.get<AuthUser>(`${this.API}/utilisateurs/login`, {
      params: { username: credentials.numeroUtilisateur, password: credentials.password }
    });
  }

  saveUser(user: AuthUser): void {
    this._user = user;
    Preferences.set({ key: this.KEY, value: JSON.stringify(user) });
  }

  getUser(): AuthUser | null {
    return this._user;
  }

  logout(): void {
    this._user = null;
    Preferences.remove({ key: this.KEY });
  }

  isLoggedIn(): boolean {
    return !!this._user;
  }

  getUserRole(): string | null {
    if (!this._user?.roles?.length) return null;
    return this._user.roles[0].name;
  }
}
