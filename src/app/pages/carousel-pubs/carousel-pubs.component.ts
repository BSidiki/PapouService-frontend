import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

type PubType = 'IMAGE' | 'VIDEO_FICHIER' | 'VIDEO_LIEN';

type Pub = {
  id?: number;
  titre?: string | null;
  lien?: string | null;
  typePub?: PubType;
  // le backend peut renvoyer string (base64) ou byte[]
  fichier?: string | number[] | null | undefined;
};

@Component({
  selector: 'app-carousel-pubs',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './carousel-pubs.component.html',
  styleUrls: ['./carousel-pubs.component.scss'],
})
export class CarouselPubsComponent implements OnInit, OnDestroy {
  pubs: Pub[] = [];
  currentIndex = 0;

  private intervalId: any;
  isPaused = false;

  // swipe
  private touchStartX = 0;
  private touchEndX = 0;

  // Zoom modal
  zoomModalVisible = false;
  zoomedPub: Pub | null = null;
  zoomLevel = 1;
  zoomPosition = { x: 0, y: 0 };
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };

  @ViewChild('carousel', { static: true })
  carouselRef!: ElementRef<HTMLDivElement>;
  @ViewChild('zoomImage', { static: false })
  zoomImageRef?: ElementRef<HTMLImageElement>;
  private readonly API = environment.apiBaseUrl;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.http.get<Pub[]>(`${this.API}/pubs`).subscribe({
      next: (data) => {
        this.pubs = data ?? [];
        // Sécurise l'index si liste vide
        this.currentIndex = this.pubs.length ? 0 : -1;
        if (this.pubs.length > 1) this.startAutoScroll();
        // S'assure que la première slide est bien en place
        setTimeout(() => this.scrollToCurrent(), 0);
      },
    });
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
    // Au cas où la modal reste ouverte
    document.body.style.overflow = '';
  }

  /* ================== Helpers ================== */

  /** Convertit string | number[] | null en data URL d'image */
  toBase64(data: string | number[] | null | undefined): string {
    if (!data) return 'assets/images/placeholder-pub.jpg';

    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (!trimmed) return 'assets/images/placeholder-pub.jpg';
      // Déjà un data URL ou une URL http(s)
      if (trimmed.startsWith('data:') || trimmed.startsWith('http')) return trimmed;
      return 'data:image/jpeg;base64,' + trimmed;
    }

    // number[] -> Uint8Array -> base64
    const arr = Array.isArray(data) ? data : [];
    if (!arr.length) return 'assets/images/placeholder-pub.jpg';

    const bytes = new Uint8Array(arr);
    let bin = '';
    // éviter "Maximum call stack size exceeded"
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    return 'data:image/jpeg;base64,' + b64;
  }

  /** Retourne true si la pub est une vidéo */
  isVideo(pub: Pub): boolean {
    return pub.typePub === 'VIDEO_FICHIER' || pub.typePub === 'VIDEO_LIEN';
  }

  /** Retourne true si la pub est une vidéo en base64/fichier */
  isVideoFile(pub: Pub): boolean {
    return pub.typePub === 'VIDEO_FICHIER';
  }

  /** Retourne true si la pub est une vidéo via lien externe */
  isVideoLink(pub: Pub): boolean {
    return pub.typePub === 'VIDEO_LIEN';
  }

  /** Convertit un lien YouTube ou direct en URL embed sécurisée */
  getVideoEmbedUrl(pub: Pub): SafeResourceUrl {
    const url = pub.lien ?? '';

    // YouTube watch URL → embed
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0`
      );
    }

    // YouTube embed déjà formé ou lien direct
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /** Retourne true si l'URL de lien est YouTube */
  isYouTubeLink(pub: Pub): boolean {
    const url = pub.lien ?? '';
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  /** Retourne la src base64 pour vidéo fichier */
  toVideoBase64(data: string | number[] | null | undefined): string {
    if (!data) return '';
    if (typeof data === 'string') return 'data:video/mp4;base64,' + data.trim();
    const arr = Array.isArray(data) ? data : [];
    if (!arr.length) return '';
    const bytes = new Uint8Array(arr);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'data:video/mp4;base64,' + btoa(bin);
  }

  /* ================== Auto défilement ================== */

  startAutoScroll(): void {
    this.stopAutoScroll();
    this.intervalId = setInterval(() => {
      if (!this.isPaused && this.pubs.length > 1) this.nextSlide();
    }, 5000);
  }

  stopAutoScroll(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /* ================== Navigation ================== */

  nextSlide(): void {
    if (!this.pubs.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.pubs.length;
    this.scrollToCurrent();
  }

  previousSlide(): void {
    if (!this.pubs.length) return;
    this.currentIndex = (this.currentIndex - 1 + this.pubs.length) % this.pubs.length;
    this.scrollToCurrent();
  }

  scrollTo(index: number): void {
    if (!this.pubs.length) return;
    this.currentIndex = Math.max(0, Math.min(index, this.pubs.length - 1));
    this.scrollToCurrent();
  }

  private scrollToCurrent(): void {
    const container = this.carouselRef?.nativeElement;
    if (!container || this.currentIndex < 0) return;
    const slideWidth = container.clientWidth;
    container.scrollTo({ left: this.currentIndex * slideWidth, behavior: 'smooth' });
  }

  @HostListener('window:resize')
  onResize(): void {
    // recalcule la position après un resize
    this.scrollToCurrent();
  }

  /* ================== Zoom modal ================== */

  openZoom(pub: Pub, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.zoomedPub = pub;
    this.zoomModalVisible = true;
    this.resetZoom();

    document.body.style.overflow = 'hidden';
  }

  closeZoom(): void {
    this.zoomModalVisible = false;
    this.zoomedPub = null;
    this.resetZoom();
    document.body.style.overflow = '';
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 0.5, 3);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 0.5, 1);
    if (this.zoomLevel === 1) this.zoomPosition = { x: 0, y: 0 };
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.zoomPosition = { x: 0, y: 0 };
  }

  // Navigation dans la modal
  nextPub(): void {
    if (!this.zoomedPub || !this.pubs.length) return;
    const i = this.pubs.indexOf(this.zoomedPub);
    const next = (i + 1) % this.pubs.length;
    this.zoomedPub = this.pubs[next];
    this.resetZoom();
  }

  previousPub(): void {
    if (!this.zoomedPub || !this.pubs.length) return;
    const i = this.pubs.indexOf(this.zoomedPub);
    const prev = (i - 1 + this.pubs.length) % this.pubs.length;
    this.zoomedPub = this.pubs[prev];
    this.resetZoom();
  }

  getCurrentPubIndex(): number {
    if (!this.zoomedPub || !this.pubs.length) return 0;
    return this.pubs.indexOf(this.zoomedPub) + 1;
  }

  // Drag (image zoomée)
  onZoomImageMouseDown(event: MouseEvent): void {
    if (this.zoomLevel <= 1) return;
    this.isDragging = true;
    this.dragStart = { x: event.clientX - this.zoomPosition.x, y: event.clientY - this.zoomPosition.y };
  }

  onZoomImageMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.zoomLevel <= 1) return;
    event.preventDefault();
    this.zoomPosition.x = event.clientX - this.dragStart.x;
    this.zoomPosition.y = event.clientY - this.dragStart.y;
  }

  onZoomImageMouseUp(): void {
    this.isDragging = false;
  }

  onZoomImageTouchStart(event: TouchEvent): void {
    if (this.zoomLevel <= 1) return;
    this.isDragging = true;
    this.dragStart = {
      x: event.touches[0].clientX - this.zoomPosition.x,
      y: event.touches[0].clientY - this.zoomPosition.y,
    };
  }

  onZoomImageTouchMove(event: TouchEvent): void {
    if (!this.isDragging || this.zoomLevel <= 1) return;
    event.preventDefault();
    this.zoomPosition.x = event.touches[0].clientX - this.dragStart.x;
    this.zoomPosition.y = event.touches[0].clientY - this.dragStart.y;
  }

  onZoomImageTouchEnd(): void {
    this.isDragging = false;
  }

  // Zoom à la molette (bonus pratique)
  @HostListener('wheel', ['$event'])
  onWheelZoom(ev: WheelEvent): void {
    if (!this.zoomModalVisible) return;
    ev.preventDefault();
    if (ev.deltaY < 0) this.zoomIn();
    else this.zoomOut();
  }

  /* ================== Raccourcis clavier ================== */
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.zoomModalVisible) this.closeZoom();
  }

  @HostListener('document:keydown.arrowRight')
  onArrowRight(): void {
    if (this.zoomModalVisible) this.nextPub();
    else this.nextSlide();
  }

  @HostListener('document:keydown.arrowLeft')
  onArrowLeft(): void {
    if (this.zoomModalVisible) this.previousPub();
    else this.previousSlide();
  }

  /* ================== Carousel interactions ================== */

  onMouseEnter(): void { this.isPaused = true; }
  onMouseLeave(): void { this.isPaused = false; }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.isPaused = true;
  }
  onTouchMove(event: TouchEvent): void {
    this.touchEndX = event.touches[0].clientX;
  }
  onTouchEnd(): void {
    const diff = this.touchStartX - this.touchEndX;
    if (Math.abs(diff) > 50) diff > 0 ? this.nextSlide() : this.previousSlide();
    this.touchStartX = 0; this.touchEndX = 0; this.isPaused = false;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/placeholder-pub.jpg';
  }
}

