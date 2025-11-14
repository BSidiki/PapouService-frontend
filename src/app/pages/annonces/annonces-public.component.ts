import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

type AnnonceDto = {
  id?: number;
  titre?: string;
  texte?: string;
  media?: string; // base64 côté backend
};

type Annonce = {
  id: number | null;
  titre: string;
  texte: string;
  media: string; // base64 | url | ''
};

@Component({
  selector: 'app-annonces-public',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './annonces-public.component.html',
  styleUrls: ['./annonces-public.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('450ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' }))
      ])
    ])
  ]
})
export class AnnoncesPublicComponent implements OnInit, OnDestroy {
  private readonly API_HOSTS = [
    'http://192.168.11.124:8080',
    'http://192.168.11.106:8080'
  ];

  annonces: Annonce[] = [];
  currentIndex = 0;

  private autoScrollHandle: any = null;
  private readonly intervalMs = 6000; // un peu plus doux

  loading = true;
  error = false;
  paused = false;

  // swipe mobile
  private touchStartX = 0;
  private touchDeltaX = 0;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAnnonces();
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  // ------------------ Chargement des annonces ------------------

  private loadAnnonces(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();

    // Essai sur le premier host, fallback sur le second si échec
    this.http.get<AnnonceDto[]>(`${this.API_HOSTS[0]}/annonces`).subscribe({
      next: (data) => {
        this.handleAnnoncesSuccess(data);
      },
      error: () => {
        // On tente le 2e host
        this.http.get<AnnonceDto[]>(`${this.API_HOSTS[1]}/annonces`).subscribe({
          next: (data) => this.handleAnnoncesSuccess(data),
          error: () => {
            this.loading = false;
            this.error = true;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  private handleAnnoncesSuccess(data: AnnonceDto[] | null | undefined): void {
    const arr = Array.isArray(data) ? data : [];
    this.annonces = arr.map(a => ({
      id: a.id ?? null,
      titre: a.titre?.trim() || 'Annonce',
      texte: a.texte?.trim() || '',
      media: a.media ?? ''
    }));

    this.loading = false;
    this.error = false;
    this.currentIndex = 0;

    if (this.annonces.length > 1) {
      this.preloadNext(this.currentIndex);
      this.startAutoScroll();
    } else {
      this.stopAutoScroll();
    }

    // IMPORTANT avec OnPush → force la mise à jour du template,
    // sinon sur mobile, tu restes bloqué sur "Chargement des annonces".
    this.cdr.markForCheck();
  }

  // ------------------ Navigation ------------------

  goToSlide(index: number): void {
    if (!this.annonces.length) return;
    this.currentIndex = index % this.annonces.length;
    this.preloadNext(this.currentIndex);
    this.cdr.markForCheck();
  }

  next(): void {
    if (!this.annonces?.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.annonces.length;
    this.preloadNext(this.currentIndex);
    this.cdr.markForCheck();
  }

  previous(): void {
    if (!this.annonces?.length) return;
    this.currentIndex = (this.currentIndex - 1 + this.annonces.length) % this.annonces.length;
    this.preloadNext(this.currentIndex);
    this.cdr.markForCheck();
  }

  // ------------------ Auto-scroll ------------------

  private startAutoScroll(): void {
    this.stopAutoScroll();
    if (this.annonces.length <= 1) return;

    this.autoScrollHandle = setInterval(() => {
      if (!this.paused) this.next();
    }, this.intervalMs);
  }

  private stopAutoScroll(): void {
    if (this.autoScrollHandle) {
      clearInterval(this.autoScrollHandle);
      this.autoScrollHandle = null;
    }
  }

  // ------------------ Images ------------------

  getMediaUrl(media: any, width?: number): string {
    // CAS 1 : data-uri déjà complet
    if (typeof media === 'string' && media.startsWith('data:image')) {
      return media;
    }

    // CAS 2 : base64 "brut"
    if (typeof media === 'string' && media.length > 0 && /^[A-Za-z0-9+/=]+$/.test(media.slice(0, 32))) {
      return 'data:image/jpeg;base64,' + media;
    }

    // CAS 3 : URL fournie
    let url = typeof media === 'string' ? media : (media?.url || '');
    if (!url) return 'assets/images/placeholder-pub.jpg';

    if (width) {
      try {
        const u = new URL(url, window.location.origin);
        u.searchParams.set('w', String(width));
        url = u.toString();
      } catch {
        // si l'URL est relative ou bizarre, on renvoie telle quelle
      }
    }

    return url;
  }

  onImgError(evt: Event) {
    const img = evt.target as HTMLImageElement | null;
    if (img) img.src = 'assets/images/placeholder-pub.jpg';
  }

  preloadNext(index: number): void {
    if (!this.annonces?.length || this.annonces.length < 2) return;
    const nextIdx = (index + 1) % this.annonces.length;
    const src = this.getMediaUrl(this.annonces[nextIdx].media, 768);
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = src;
  }

  // ------------------ Pause / interactions ------------------

  onMouseEnter(): void { this.paused = true; }
  onMouseLeave(): void { this.paused = false; }

  onTouchStart(evt: TouchEvent): void {
    this.paused = true;
    this.touchStartX = evt.touches[0].clientX;
    this.touchDeltaX = 0;
  }

  onTouchMove(evt: TouchEvent): void {
    this.touchDeltaX = evt.touches[0].clientX - this.touchStartX;
  }

  onTouchEnd(): void {
    const threshold = 40;
    if (this.touchDeltaX > threshold) this.previous();
    else if (this.touchDeltaX < -threshold) this.next();

    this.paused = false;
    this.touchStartX = 0;
    this.touchDeltaX = 0;
  }

  // Accessibilité : flèches clavier
  @HostListener('document:keydown.arrowleft') keyPrev() { this.previous(); }
  @HostListener('document:keydown.arrowright') keyNext() { this.next(); }
}
