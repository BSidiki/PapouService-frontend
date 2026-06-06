import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { PushService } from './services/push.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, IonApp],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private push = inject(PushService);

  ngOnInit(): void {
    // Initialiser les push notifications APRÈS le démarrage de l'app
    // Le délai évite de bloquer le rendu initial
    setTimeout(() => this.push.init(), 1500);
  }
}
