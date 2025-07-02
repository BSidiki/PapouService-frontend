import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { trigger, state, style, transition, animate } from '@angular/animations';


@Component({
  selector: 'app-header-public',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
  ],

  templateUrl: './header-public.component.html',
  styleUrls: ['./header-public.component.scss'],
  animations: [
    trigger('sidenavAnimation', [
      state('open', style({ transform: 'translateX(0)' })),
      state('closed', style({ transform: 'translateX(-100%)' })),
      transition('closed => open', animate('300ms ease-out')),
      transition('open => closed', animate('200ms ease-in'))
    ])
  ]
})
export class HeaderPublicComponent {
  showMenu = false;

  toggleMenu() {
    this.showMenu = !this.showMenu;
  }
}
