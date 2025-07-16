import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { HeaderPublicComponent } from "../../layout/header-public/header-public.component";
import { FooterComponent } from "../../layout/footer/footer.component";

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, HeaderPublicComponent, FooterComponent],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent {
  faqs = [
    {
      question: 'Comment créer un compte chez PAPOU SERVICE ?',
      answer: 'Cliquez sur "Inscription" en haut à droite, remplissez le formulaire, puis validez.'
    },
    {
      question: 'Comment faire un dépôt ?',
      answer: 'Une fois connecté, allez dans "Faire un dépôt" et suivez les instructions.'
    },
    {
      question: 'Comment faire un retrait ?',
      answer: 'Une fois connecté, allez dans "Faire un retrait" et suivez les instructions.'
    },
    {
      question: 'Où ce trauve les services PAPOU SERVICE ?',
      answer: 'Nous sommes présent dans les villes suivantes: OUAHIGOUYA, OUAGADOUGOU, BOBO DIOULASSO, DEDOUGOU'
    },
    {
      question: 'Quels sont les moyens de paiement disponibles ?',
      answer: 'Orange Money, Moov Money, Carte bancaire, etc.'
    },
    {
      question: 'Comment contacter l’assistance ?',
      answer: 'Via la page "Contact" accessible depuis le menu principal.'
    }
  ];
}
