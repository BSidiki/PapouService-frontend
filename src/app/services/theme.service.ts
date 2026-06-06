import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'ps_dark_theme';
  isDark = false;

  constructor() {
    this.isDark = localStorage.getItem(this.KEY) === 'true';
    this.apply();
  }

  toggle(): void {
    this.isDark = !this.isDark;
    localStorage.setItem(this.KEY, String(this.isDark));
    this.apply();
  }

  private apply(): void {
    document.body.classList.toggle('dark-theme', this.isDark);
  }
}
