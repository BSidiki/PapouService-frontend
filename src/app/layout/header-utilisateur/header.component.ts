import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { NotificationService } from '../../services/notification.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-layout-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class LayoutHeaderComponent implements OnInit {
  menuOpen = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    public theme: ThemeService,
    public notifService: NotificationService
  ) {}

  ngOnInit(): void {}

  get user() { return this.authService.getUser(); }
  get role(): string | null { return this.authService.getUserRole(); }

  get initials(): string {
    const f = this.user?.prenomUtilisateur || '';
    const l = this.user?.nomUtilisateur || '';
    return ((f.trim().charAt(0) || '') + (l.trim().charAt(0) || '')).toUpperCase() || 'U';
  }

  get avatarUrl(): string | null { return null; }

  get homeRoute(): string {
    return this.role === 'ADMIN' ? '/admin/dashboard' : '/user/profil';
  }

  openMenu()  { this.menuOpen = true; }
  closeMenu() { this.menuOpen = false; }

  navigate(route: string) {
    this.menuOpen = false;
    this.router.navigate([route]);
  }

  logout() {
    this.menuOpen = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  getRoleText(role: string | null): string {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'USER':  return 'Utilisateur';
      default:      return 'Utilisateur';
    }
  }
}
