import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-layout-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatMenuModule,
    NgIf
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class LayoutHeaderComponent implements OnInit {
  isMobile = false;

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;

    // Si on repasse en desktop on s'assure que le scroll body est réactivé
    if (!this.isMobile) {
      document.body.classList.remove('sidenav-open');
    }
  }

  // === Données utilisateur ===
  get user() {
    return this.authService.getUser();
  }

  get role(): string | null {
    return this.authService.getUserRole();
  }

  get initials(): string {
    const f = this.user?.prenomUtilisateur || '';
    const l = this.user?.nomUtilisateur || '';
    const fi = f.trim().charAt(0) || '';
    const li = l.trim().charAt(0) || '';
    return (fi + li).toUpperCase() || 'U';
  }

  /** Si un jour le backend sert une URL d'avatar, renvoie-la, sinon null */
  get avatarUrl(): string | null {
    return null;
  }

  // Fermer le drawer sur mobile
  closeDrawer(drawer: any) {
    if (this.isMobile && drawer) {
      drawer.close();
    }
  }

  // Gestion du body quand le sidenav mobile est ouvert / fermé
  onDrawerOpened() {
    if (this.isMobile) {
      document.body.classList.add('sidenav-open');
    }
  }

  onDrawerClosed() {
    document.body.classList.remove('sidenav-open');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  // Navigation avec fermeture du drawer
  navigate(drawer: any, route: string) {
    this.closeDrawer(drawer);
    this.router.navigate([route]);
  }

  /** Fermer le menu MatMenu et naviguer */
  menuNavigate(route: string) {
    this.router.navigate([route]);
  }

  /** Route d'accueil du rôle courant */
  get homeRoute(): string {
    return this.role === 'ADMIN' ? '/admin/dashboard' : '/user/profil';
  }

  // Méthode pour le texte du rôle
  getRoleText(role: string | null): string {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'USER': return 'Utilisateur';
      default: return 'Utilisateur';
    }
  }
}
