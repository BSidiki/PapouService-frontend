import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { HeaderPublicComponent } from '../../layout/header-public/header-public.component';
import { FooterComponent } from '../../layout/footer/footer.component';
import { AnnoncesPublicComponent } from '../annonces/annonces-public.component';
import { CarouselPubsComponent } from '../carousel-pubs/carousel-pubs.component';

@Component({
  selector: 'app-accueil-public',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    HeaderPublicComponent,
    FooterComponent,
    AnnoncesPublicComponent,
    CarouselPubsComponent
  ],
  templateUrl: './accueil-public.component.html',
  styleUrls: ['./accueil-public.component.scss']
})
export class AccueilPublicComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);

  annonces: any[] = [];
  albums: any[] = [];

  loading = { annonces: false, albums: false };
  error = { annonces: '', albums: '' };

  // Carrousel auto-slide
  currentIndex = 0;
  private slideTimer: any;

  ngOnInit(): void {
    // ⚠️ Remplace par ton environment (ex: environment.apiUrl)
    const API = 'http://192.168.11.124:8080';

    this.loading.annonces = true;
    this.http.get<any[]>(`${API}/annonces`).subscribe({
      next: data => {
        this.annonces = data ?? [];
        this.loading.annonces = false;
        this.startAutoSlide();
      },
      error: () => {
        this.loading.annonces = false;
        this.error.annonces = 'Impossible de charger les annonces pour le moment.';
      }
    });

    this.loading.albums = true;
    this.http.get<any[]>(`${API}/albums`).subscribe({
      next: data => {
        this.albums = data ?? [];
        this.loading.albums = false;
      },
      error: () => {
        this.loading.albums = false;
        this.error.albums = 'Impossible de charger les albums pour le moment.';
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  private startAutoSlide() {
    this.stopAutoSlide();
    if (this.annonces.length > 1) {
      this.slideTimer = setInterval(() => {
        this.currentIndex = (this.currentIndex + 1) % this.annonces.length;
      }, 4000);
    }
  }

  private stopAutoSlide() {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
      this.slideTimer = null;
    }
  }

  trackById = (_: number, item: any) => item?.id ?? item?.idAnnonce ?? _;

  toBase64(media: string | number[] | Uint8Array): string {
    if (!media) return '';
    if (typeof media === 'string') {
      return 'data:image/jpeg;base64,' + media;
    }
    const bytes = media instanceof Uint8Array ? media : new Uint8Array(media as number[]);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
    }
    return 'data:image/jpeg;base64,' + btoa(binary);
  }
}
