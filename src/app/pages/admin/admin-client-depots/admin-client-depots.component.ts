import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Location } from '@angular/common';

@Component({
  selector: 'app-admin-client-depots',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './admin-client-depots.component.html',
  styleUrls: ['./admin-client-depots.component.scss']
})
export class AdminClientDepotsComponent implements OnInit {
  clientId!: string;
  depots: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id')!;
    this.http.get<any[]>(`http://192.168.244.230:8080/utilisateurs/${this.clientId}/listDepots`)
      .subscribe({
        next: data => this.depots = data.reverse(),
        error: err => {
          console.error(err);
          alert('Erreur lors du chargement des dépôts');
        }
      });
  }

  voirDetails(id: number) {
    this.router.navigate(['/user/depot', id]);
  }
  goBack() {
    this.location.back();
  }
}
