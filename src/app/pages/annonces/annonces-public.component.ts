import {
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-annonces-public',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './annonces-public.component.html',
  styleUrls: ['./annonces-public.component.scss'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('400ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' }))
      ])
    ])
  ]
})
export class AnnoncesPublicComponent implements OnInit, OnDestroy {
  annonces: any[] = [];
  currentIndex = 0;
  autoScrollInterval: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>('http://192.168.244.230:8080/annonces').subscribe({
      next: (data) => {
        this.annonces = data;
        this.startAutoScroll();
      },
      error: () => alert("Erreur lors du chargement des annonces")
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.autoScrollInterval);
  }

  goToSlide(index: number) {
    this.currentIndex = index;
  }
  getMediaUrl(media: string): string {
    return media ? this.toBase64(media) : 'assets/images/placeholder.jpg';
  }

  toBase64(media: string): string {
    return 'data:image/jpeg;base64,' + media;
  }

  startAutoScroll() {
    this.autoScrollInterval = setInterval(() => {
      this.next();
    }, 5000);
  }

  previous() {
    this.currentIndex = (this.currentIndex - 1 + this.annonces.length) % this.annonces.length;
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.annonces.length;
  }
}
