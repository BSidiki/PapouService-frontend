import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://192.168.11.100:8080'; // Adapté à ton backend

  constructor(public http: HttpClient) {}

  login(credentials: { numeroUtilisateur: string; password: string }) {
    const params = {
      username: credentials.numeroUtilisateur,
      password: credentials.password
    };
    return this.http.get(`${this.apiUrl}/utilisateurs/login`, { params });
  }

  saveUser(user: any) {
    localStorage.setItem('current_user', JSON.stringify(user));
  }

  getUser(): any {
    const user = localStorage.getItem('current_user');
    return user ? JSON.parse(user) : null;
  }

  logout() {
    localStorage.removeItem('current_user');
  }

  isLoggedIn(): boolean {
    return !!this.getUser();
  }

  getUserRole(): string | null {
    const user = this.getUser();
    if (!user || !user.roles || user.roles.length === 0) return null;
    return user.roles[0].name;
  }
}
