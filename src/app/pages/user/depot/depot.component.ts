import { AuthService } from './../../../services/auth.service';
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AnnoncesPublicComponent } from '../../annonces/annonces-public.component';
import { MatchsComponent } from '../../matchs/matchs.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { firstValueFrom } from 'rxjs';

type User = {
  idUtilisateur: number;
  id_1XBET?: string; id_BETWINNER?: string; id_MELBET?: string; id_1WIN?: string; id_888STARZ?: string;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
};

@Component({
  selector: 'app-depot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    AnnoncesPublicComponent,
    MatchsComponent,
    FooterComponent
  ],
  templateUrl: './depot.component.html',
  styleUrls: ['./depot.component.scss']
})
export class DepotComponent {
  private readonly API_HOSTS = [
    'http://192.168.11.124:8080',
    'http://192.168.11.119:8080'
  ];

  form = {
    pays: '',
    indicatif: '',
    numero: '',
    montant: null as number | null,
    optionDepot: '',            // O, M, W, S, C
    optionDeTransaction: ''     // 1XBET, BETWINNER, MELBET, 1WIN, 888STARZ
  };

  file: File | null = null;
  userId = 0;
  userInfo = '';
  transactionOptionsDisponibles: { label: string; value: string; id: string | null }[] = [];
  filePreview: string | null = null;
  submitting = false;

  paysOptions = [
    { nom: 'Burkina Faso', indicatif: '+226' },
    { nom: 'Côte d\'Ivoire', indicatif: '+225' },
    { nom: 'Togo', indicatif: '+228' },
    { nom: 'Bénin', indicatif: '+229' }
  ];

  constructor(private http: HttpClient, private auth: AuthService, private snack: MatSnackBar) {
    const user = (this.auth.getUser?.() ?? null) as User | null;

    if (!user) {
      this.snack.open('Vous devez être connecté pour faire un dépôt.', 'Fermer', { duration: 3500 });
      return;
    }

    this.userId = user.idUtilisateur;
    this.userInfo = `${user.prenomUtilisateur || ''} ${user.nomUtilisateur || ''}`.trim();

    // Liste des plateformes visibles selon les ID présents sur le user
    this.transactionOptionsDisponibles = [
      { label: '1XBET',     value: '1XBET',     id: user.id_1XBET     ?? null },
      { label: 'BETWINNER', value: 'BETWINNER', id: user.id_BETWINNER ?? null },
      { label: 'MELBET',    value: 'MELBET',    id: user.id_MELBET    ?? null },
      { label: '1WIN',      value: '1WIN',      id: user.id_1WIN      ?? null },
      { label: '888STARZ',  value: '888STARZ',  id: user.id_888STARZ  ?? null }
    ].filter(o => !!o.id);
  }

  onFileSelected(event: any) {
    const f: File | undefined = event?.target?.files?.[0];
    if (!f) { this.file = null; this.filePreview = null; return; }

    if (!f.type.startsWith('image/')) {
      this.snack.open('Le fichier doit être une image.', 'Fermer', { duration: 3000 });
      event.target.value = '';
      return;
    }
    if (f.size > 5 * 1024 * 1024) { // 5 Mo
      this.snack.open('Image trop volumineuse (max 5 Mo).', 'Fermer', { duration: 3000 });
      event.target.value = '';
      return;
    }

    this.file = f;

    // Aperçu
    const reader = new FileReader();
    reader.onload = () => this.filePreview = reader.result as string;
    reader.readAsDataURL(f);
  }

  onPaysChange() {
    const selected = this.paysOptions.find(p => p.nom === this.form.pays);
    this.form.indicatif = selected?.indicatif || '';
  }

  // ------------------ USSD / apps ------------------

  public isMobile(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  private buildUssdCode(): string {
    const montant = this.form.montant ?? 0;
    const depot = this.form.optionDepot;
    const trx = this.form.optionDeTransaction;

    if (!montant || !depot || !trx) return '';

    // Gabarits USSD
    const OM = {
      '1XBET':     `*144*2*1*75000000*${montant}#`,
      'BETWINNER': `*144*2*1*75000011*${montant}#`,
      'MELBET':    `*144*2*1*75000022*${montant}#`,
      '1WIN':      `*144*2*1*75000033*${montant}#`,
      '888STARZ':  `*144*2*1*75000044*${montant}#`,
    } as const;

    const MOOV = {
      '1XBET':     `*555*2*1*72000000*${montant}#`,
      'BETWINNER': `*555*2*1*72000011*${montant}#`,
      'MELBET':    `*555*2*1*72000022*${montant}#`,
      '1WIN':      `*555*2*1*72000033*${montant}#`,
      '888STARZ':  `*555*2*1*72000044*${montant}#`,
    } as const;

    if (depot === 'O') return (OM as any)[trx] ?? '';
    if (depot === 'M') return (MOOV as any)[trx] ?? '';
    return '';
  }

  ouvrirTelephone() {
    const code = this.buildUssdCode();
    if (!code) {
      this.snack.open('Veuillez choisir Montant + Options valides.', 'Fermer', { duration: 3000 });
      return;
    }

    if (this.isMobile()) {
      const telLink = 'tel:' + encodeURIComponent(code);
      window.location.href = telLink;
    } else {
      // Desktop: copie dans le presse-papiers
      navigator.clipboard?.writeText(code).then(() => {
        this.snack.open(`Code USSD copié: ${code}`, 'Fermer', { duration: 4000 });
      }).catch(() => {
        this.snack.open(`Code USSD: ${code}`, 'Fermer', { duration: 4000 });
      });
    }
  }

  ouvrirWave() {
    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = 'intent://open/#Intent;package=com.wave.personal;scheme=wave;end';
      return;
    }
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = 'wave://';
      setTimeout(() => window.location.href = 'https://apps.apple.com/app/wave-money/id6474282122', 500);
      return;
    }
    window.open('https://wave.com', '_blank');
  }

  ouvrirSankMoney() {
    const schemes = ['sankmoney://', 'com.sankmoney.app://', 'sank-money://'];
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const fallback = isIOS
      ? 'https://apps.apple.com/app/sank-money/id6474282122'
      : 'https://play.google.com/store/apps/details?id=com.sankmoney.app';

    let tried = 0;
    const tryNext = () => {
      if (tried >= schemes.length) { window.open(fallback, '_blank'); return; }
      window.location.href = schemes[tried++];
      setTimeout(tryNext, 300);
    };
    tryNext();
  }

  // ------------------ Soumission dépôt ------------------

  private async postWithFallback(path: string, body: FormData): Promise<void> {
    for (const host of this.API_HOSTS) {
      try {
        await firstValueFrom(this.http.post(`${host}${path}`, body));
        return;
      } catch (error) {
        console.warn(`Hôte ${host} inaccessible, tentative suivante...`);
        continue;
      }
    }
    throw new Error('POST échoué sur tous les hôtes');
  }

  isSubmitDisabled(): boolean {
    return !this.userId
      || !this.form.pays
      || !this.form.numero
      || !this.form.indicatif
      || !this.form.montant || this.form.montant <= 0
      || !this.form.optionDeTransaction
      || !this.form.optionDepot
      || !this.file;
  }

  async submitDepot() {
    if (this.isSubmitDisabled()) {
      this.snack.open('Veuillez compléter le formulaire et joindre la capture.', 'Fermer', { duration: 3000 });
      return;
    }

    this.submitting = true;

    try {
      const numeroComplet = `${this.form.indicatif}${this.form.numero}`;
      const fd = new FormData();
      fd.append('numeroEnvoyant', numeroComplet);
      fd.append('montant', String(this.form.montant!));
      fd.append('optionDepot', this.form.optionDepot);
      fd.append('pays', this.form.pays);
      fd.append('optionDeTransaction', this.form.optionDeTransaction);
      fd.append('capture', this.file!);

      await this.postWithFallback(`/depots/user/${this.userId}`, fd);

      this.snack.open('✅ Dépôt soumis avec succès !', 'Fermer', { duration: 4000 });
      this.resetForm();
    } catch (error) {
      console.error('Erreur dépôt:', error);
      this.snack.open('❌ Erreur lors du dépôt. Veuillez réessayer.', 'Fermer', { duration: 4000 });
    } finally {
      this.submitting = false;
    }
  }

  private resetForm() {
    this.form = {
      pays: '',
      indicatif: '',
      numero: '',
      montant: null,
      optionDepot: '',
      optionDeTransaction: ''
    };
    this.file = null;
    this.filePreview = null;
    // Réinitialiser l'input file
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getOptionDepotText(option: string): string {
    const options: { [key: string]: string } = {
      'O': 'Orange Money',
      'M': 'Moov Money',
      'W': 'Wave',
      'S': 'Sank Money',
      'C': 'Carte Bancaire'
    };
    return options[option] || option;
  }

  getPlatformLogo(platform: string): string {
    return `assets/images/${platform}.png`;
  }
}
