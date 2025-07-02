import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { HeaderPublicComponent } from "../../layout/header-public/header-public.component";

@Component({
  selector: 'app-a-propos',
  standalone: true,
  imports: [CommonModule, MatCardModule, HeaderPublicComponent],
  templateUrl: './a-propos.component.html',
  styleUrls: ['./a-propos.component.scss']
})
export class AProposComponent {}
