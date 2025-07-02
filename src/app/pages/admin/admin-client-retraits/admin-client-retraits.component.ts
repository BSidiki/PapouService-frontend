import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Location } from '@angular/common';

@Component({
  selector: 'app-admin-client-retraits',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './admin-client-retraits.component.html',
  styleUrls: ['./admin-client-retraits.component.scss']
})
export class AdminClientRetraitsComponent implements OnInit {
  clientId!: string;
  retraits: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id')!;
    this.http.get<any[]>(`http://192.168.244.230:8080/utilisateurs/${this.clientId}/listRetraits`)
      .subscribe({
        next: data => this.retraits = data.reverse(),
        error: err => {
          console.error(err);
          alert('Erreur lors du chargement des retraits');
        }
      });
  }

  voirDetails(id: number) {
    this.router.navigate(['/user/retrait', id]);
  }
  goBack() {
    this.location.back();
  }
}
