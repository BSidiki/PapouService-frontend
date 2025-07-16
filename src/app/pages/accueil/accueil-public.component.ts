import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FooterComponent } from '../../layout/footer/footer.component';
import { HeaderPublicComponent } from '../../layout/header-public/header-public.component';
import { AnnoncesPublicComponent } from "../annonces/annonces-public.component";
// import { MatchsComponent } from "../matchs/matchs.component";
import { CarouselPubsComponent } from "../carousel-pubs/carousel-pubs.component";

@Component({
  selector: 'app-accueil-public',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    FooterComponent,
    HeaderPublicComponent,
    AnnoncesPublicComponent,
    // MatchsComponent,
    CarouselPubsComponent
],
  templateUrl: './accueil-public.component.html',
  styleUrls: ['./accueil-public.component.scss']
})
export class AccueilPublicComponent implements OnInit {
[x: string]: any;
nextAnnonce() {
throw new Error('Method not implemented.');
}
previousAnnonce() {
throw new Error('Method not implemented.');
}
  annonces: any[] = [];
  albums: any[] = [];
  currentIndex = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>('http://192.168.57.230:8080/annonces').subscribe(data => {
      this.annonces = data;
      this.autoSlide();
    });

    this.http.get<any[]>('http://192.168.57.230:8080/albums').subscribe(data => {
      this.albums = data;
    });
  }

  toBase64(bytes: number[]): string {
    return 'data:image/jpeg;base64,' + btoa(String.fromCharCode(...bytes));
  }

  autoSlide() {
    setInterval(() => {
      if (this.annonces.length > 0) {
        this.currentIndex = (this.currentIndex + 1) % this.annonces.length;
      }
    }, 4000);
  }
}

