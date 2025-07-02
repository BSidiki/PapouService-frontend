import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-carousel-pubs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel-pubs.component.html',
  styleUrls: ['./carousel-pubs.component.scss']
})
export class CarouselPubsComponent implements OnInit, OnDestroy {
  pubs: any[] = [];
  currentIndex = 0;
  intervalId: any;

  @ViewChild('carousel', { static: true }) carouselRef!: ElementRef<HTMLDivElement>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>('http://192.168.244.230:8080/pubs').subscribe({
      next: data => {
        this.pubs = data;
        this.startAutoScroll();
      },
      error: () => alert("Erreur chargement des publicités")
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  toBase64(data: string): string {
    return 'data:image/jpeg;base64,' + data;
  }

  startAutoScroll() {
    const container = this.carouselRef.nativeElement;
    if (!container) return;

    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.pubs.length;
      const slideWidth = container.clientWidth;
      container.scrollTo({
        left: this.currentIndex * slideWidth,
        behavior: 'smooth'
      });
    }, 5000);
  }

  scrollTo(index: number) {
    const container = this.carouselRef.nativeElement;
    if (!container) return;
    this.currentIndex = index;
    const slideWidth = container.clientWidth;
    container.scrollTo({
      left: index * slideWidth,
      behavior: 'smooth'
    });
  }
}
