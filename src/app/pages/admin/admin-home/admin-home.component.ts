import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutHeaderComponent } from '../../../layout/header-utilisateur/header.component';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [CommonModule, LayoutHeaderComponent],
  template: `
    <app-layout-header></app-layout-header>`
})
export class AdminHomeComponent {}
