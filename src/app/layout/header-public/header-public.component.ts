import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { filter } from 'rxjs/operators';

// Ex: modèle minimal du user renvoyé par AuthService
type AppUser = {
  idUtilisateur: number;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  email?: string;
  role?: 'USER' | 'ADMIN';
  avatarUrl?: string;      // ← si tu l’ajoutes côté backend
  avatarBytesBase64?: string; // ← si tu renvoies un byte[] en base64
};

@Component({
  selector: 'app-header-public',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './header-public.component.html',
  styleUrls: ['./header-public.component.scss']
})
export class HeaderPublicComponent {
  showMenu = false;

  // Simule ton AuthService existant (remplace par un vrai service)
  private router = inject(Router);
  private auth = {
    isLoggedIn: (): boolean => !!localStorage.getItem('token'),
    getUser: (): AppUser | null => {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) as AppUser : null;
    },
    getUserRole: (): 'USER' | 'ADMIN' | null => (this.auth.getUser()?.role ?? null),
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };


  user: AppUser | null = null;
  loggedIn = false;

  constructor() {
    // Ferme le menu mobile à chaque navigation
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.showMenu = false;
      this.refreshAuthState();
    });
    this.refreshAuthState();
  }

  refreshAuthState() {
    this.loggedIn = this.auth.isLoggedIn();
    this.user = this.auth.getUser();
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;
    document.body.style.overflow = this.showMenu ? 'hidden' : '';
  }

  closeMenu() {
    this.showMenu = false;
    document.body.style.overflow = '';
  }

  onNavClick() {
    this.closeMenu();
  }

  goToAccount() {
    const role = this.auth.getUserRole();
    if (role === 'ADMIN') this.router.navigate(['/admin']);
    else this.router.navigate(['/user']);
    this.closeMenu();
  }

  logout() {
    this.auth.logout();
    this.refreshAuthState();
    this.router.navigate(['/login']);
  }

  // Fallback avatar (initiales)
  get initials(): string {
    const n = (this.user?.prenomUtilisateur ?? '').trim();
    const p = (this.user?.nomUtilisateur ?? '').trim();
    const a = (n ? n[0] : '') + (p ? p[0] : '');
    return a.toUpperCase() || 'U';
  }

  // Source d’image si backend dispo (URL ou base64). Sinon null.
  get avatarSrc(): string | null {
    if (this.user?.avatarUrl) return this.user.avatarUrl;
    if (this.user?.avatarBytesBase64) return `data:image/jpeg;base64,${this.user.avatarBytesBase64}`;
    return null;
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 769) this.closeMenu();
  }

  getUserRoleText(role?: string): string {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'USER': return 'Utilisateur';
      default: return 'Utilisateur';
    }
  }
}
