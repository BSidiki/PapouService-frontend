import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Location } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-depot-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule ],
  templateUrl: './depot-detail.component.html',
  styleUrls: ['./depot-detail.component.scss']
})
export class DepotDetailComponent implements OnInit {
  depot: any;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get(`http://192.168.244.230:8080/depots/${id}`).subscribe({
      next: (data) => this.depot = data,
      error: (err) => {
        console.error(err);
        alert("Erreur lors du chargement du dépôt");
      }
    });
  }

  toBase64(media: any): string {
    return 'data:image/jpeg;base64,' + media;
  }

  goBack() {
    this.location.back();
  }
}
