import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderPublicComponent } from "../../layout/header-public/header-public.component";
import { FooterComponent } from "../../layout/footer/footer.component";
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

type Faq = {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
};

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    HeaderPublicComponent,
    FooterComponent
  ],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  search = '';
  expandedAll = false;
  expandedId: string | null = null;
  faqJsonLd!: SafeHtml;

  faqs: Faq[] = [
    {
      id: 'faq-1',
      question: 'Comment créer un compte chez PAPOU SERVICE ?',
      answer: 'Cliquez sur « Inscription » en haut à droite, remplissez le formulaire, puis validez.',
      keywords: ['compte', 'inscription', 'créer', 'register']
    },
    {
      id: 'faq-2',
      question: 'Comment faire un dépôt ?',
      answer: 'Une fois connecté, allez dans « Faire un dépôt » et suivez les instructions.',
      keywords: ['dépôt', 'depot', 'payer', 'envoyer argent']
    },
    {
      id: 'faq-3',
      question: 'Comment faire un retrait ?',
      answer: 'Une fois connecté, allez dans « Faire un retrait » et suivez les instructions.',
      keywords: ['retrait', 'retirer', 'retirer argent']
    },
    {
      id: 'faq-4',
      question: 'Où se trouvent les services PAPOU SERVICE ?',
      answer: 'Nous sommes présents dans les villes suivantes : Ouahigouya, Ouagadougou, Bobo-Dioulasso, Dédougou.',
      keywords: ['adresse', 'localisation', 'ville', 'où', 'ou']
    },
    {
      id: 'faq-5',
      question: 'Quels sont les moyens de paiement disponibles ?',
      answer: 'Orange Money, Moov Money, Carte bancaire, etc.',
      keywords: ['paiement', 'moyens', 'orange', 'moov', 'carte']
    },
    {
      id: 'faq-6',
      question: 'Comment contacter l’assistance ?',
      answer: 'Via la page « Contact » accessible depuis le menu principal.',
      keywords: ['contact', 'assistance', 'support', 'aide']
    }
  ];

  get filteredFaqs(): Faq[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.faqs;
    return this.faqs.filter(f =>
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q) ||
      (f.keywords ?? []).some(k => k.toLowerCase().includes(q))
    );
  }

  ngOnInit(): void {
    // Récupère ?q= et ?id= dans l’URL pour préfiltrer/ouvrir
    this.route.queryParamMap.subscribe(p => {
      this.search = p.get('q') ?? '';
      this.expandedId = p.get('id');
    });
    this.buildJsonLd();
  }

  toggleAll() {
    this.expandedAll = !this.expandedAll;
    if (this.expandedAll) this.expandedId = null; // on laisse tout ouvert
  }

  copyLink(f: Faq) {
    const url = new URL(window.location.href);
    url.searchParams.set('id', f.id);
    if (this.search) url.searchParams.set('q', this.search);
    navigator.clipboard.writeText(url.toString())
      .then(() => alert('Lien copié ✅'))
      .catch(() => alert('Impossible de copier le lien'));
  }

  onSearchChange() {
    // synchronise l’URL (utile pour partager)
    const q: any = this.search ? { q: this.search } : {};
    this.router.navigate([], { relativeTo: this.route, queryParams: { ...q, id: this.expandedId ?? undefined }, queryParamsHandling: 'merge' });
  }

  setExpanded(id: string | null) {
    this.expandedId = id;
    this.router.navigate([], { relativeTo: this.route, queryParams: { id: id ?? undefined }, queryParamsHandling: 'merge' });
  }

  private buildJsonLd() {
    const json = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': this.faqs.map(f => ({
        '@type': 'Question',
        'name': f.question,
        'acceptedAnswer': { '@type': 'Answer', 'text': f.answer }
      }))
    };
    const html = `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
    this.faqJsonLd = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  trackById(_: number, f: Faq) { return f.id; }
}
