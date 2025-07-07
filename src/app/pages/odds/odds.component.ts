// src/app/pages/odds/odds.component.ts
import { Component, OnInit } from '@angular/core';
import { OddsService } from '../../services/odds.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-odds',
  templateUrl: './odds.component.html',
  styleUrls: ['./odds.component.scss'],
  imports: [MatFormFieldModule, MatSelectModule, FormsModule, CommonModule  ]
})
export class OddsComponent implements OnInit {
  sports: any[] = [];
  odds: any[] = [];
  selectedSport = '';

  constructor(private oddsService: OddsService) {}

  ngOnInit() {
    this.oddsService.getSports().subscribe(s => this.sports = s);
  }

  chargerOdds() {
    this.oddsService.getOdds(this.selectedSport).subscribe(o => this.odds = o);
  }
}
