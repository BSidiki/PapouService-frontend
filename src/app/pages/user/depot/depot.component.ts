import { AuthService } from './../../../services/auth.service';
import { PlatformUtilsService } from '../../../services/platform-utils.service';
import { DepotService } from '../../../services/depot.service';
import { ErrorService } from '../../../services/error.service';
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AnnoncesPublicComponent } from '../../annonces/annonces-public.component';
import { MatchsComponent } from '../../matchs/matchs.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { firstValueFrom } from 'rxjs';
import { Utilisateur } from '../../../models';

@Component({
  selector: 'app-depot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
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
export class DepotComponent implements OnDestroy {
  form = {
    pays: '',
    indicatif: '',
    numero: '',
    montant: null as number | null,
    optionDepot: '',
    optionDeTransaction: ''
  };

  file: File | null = null;
  showConfirm = false;
  userId = 0;
  userInfo = '';
  isGuestMode = false;
  guestIdPlateforme = '';
  guestNom = '';
  guestPrenom = '';
  transactionOptionsDisponibles: { label: string; value: string; id: string | null }[] = [];
  filePreview: string | null = null;
  submitting = false;
  showGuestNameFields = false;
  showCountdown = false;
  countdownSeconds = 180;
  private countdownInterval: any = null;

  get countdownDisplay(): string {
    const m = Math.floor(this.countdownSeconds / 60);
    const s = this.countdownSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  quickAmounts = [1000, 2000, 3000, 5000, 10000, 15000, 20000, 25000, 50000, 1000000];

  paysOptions = [
    { nom: 'Burkina Faso', indicatif: '+226' },
    { nom: 'Côte d\'Ivoire', indicatif: '+225' },
    { nom: 'Togo', indicatif: '+228' },
    { nom: 'Bénin', indicatif: '+229' },
    { nom: 'Mali', indicatif: '+223' },
    { nom: 'Niger', indicatif: '+227' }
  ];

  constructor(
    private auth: AuthService,
    private depotService: DepotService,
    private platform: PlatformUtilsService,
    private errorService: ErrorService
  ) {
    const user = (this.auth.getUser?.() ?? null) as Utilisateur | null;

    if (!user) {
      this.isGuestMode = true;
      // Guests can choose any platform — they'll enter their ID manually
      this.transactionOptionsDisponibles = [
        { label: '1XBET',     value: '1XBET',     id: '1XBET' },
        { label: 'BETWINNER', value: 'BETWINNER', id: 'BETWINNER' },
        { label: 'MELBET',    value: 'MELBET',    id: 'MELBET' },
        { label: '888STARZ',  value: '888STARZ',  id: '888STARZ' }
      ];
      return;
    }

    this.userId = user.idUtilisateur;
    this.userInfo = `${user.prenomUtilisateur || ''} ${user.nomUtilisateur || ''}`.trim();

    // Liste des plateformes visibles selon les ID présents sur le user
    this.transactionOptionsDisponibles = [
      { label: '1XBET',     value: '1XBET',     id: user.id_1XBET     ?? null },
      { label: 'BETWINNER', value: 'BETWINNER', id: user.id_BETWINNER ?? null },
      { label: 'MELBET',    value: 'MELBET',    id: user.id_MELBET    ?? null },
      { label: '888STARZ',  value: '888STARZ',  id: user.id_888STARZ  ?? null }
    ].filter(o => !!o.id);
  }

  onFileSelected(event: any) {
    const f: File | undefined = event?.target?.files?.[0];
    if (!f) { this.file = null; this.filePreview = null; return; }

    if (!f.type.startsWith('image/')) {
      this.errorService.toast('Le fichier doit être une image.', 'danger', 3000);
      event.target.value = '';
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      this.errorService.toast('Image trop volumineuse (max 5 Mo).', 'danger', 3000);
      event.target.value = '';
      return;
    }

    this.file = f;
    const reader = new FileReader();
    reader.onload = () => this.filePreview = reader.result as string;
    reader.readAsDataURL(f);
  }

  removeFile() {
    this.file = null;
    this.filePreview = null;
  }

  onPaysChange() {
    const selected = this.paysOptions.find(p => p.nom === this.form.pays);
    this.form.indicatif = selected?.indicatif || '';
  }

  // ------------------ Numéros de paiement par plateforme ------------------

  getPaymentNumber(): string {
    const depot = this.form.optionDepot as 'O' | 'M';
    const trx = this.form.optionDeTransaction;
    if (!depot || !trx || !['O','M'].includes(depot)) return '';
    return this.platform.getPaymentNumber(trx, depot);
  }

  // ------------------ USSD / apps ------------------

  public isMobile(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  private buildUssdCode(): string {
    const montant = this.form.montant ?? 0;
    const depot = this.form.optionDepot as 'O' | 'M';
    const trx = this.form.optionDeTransaction;
    if (!montant || !depot || !trx || !['O','M'].includes(depot)) return '';
    return this.platform.buildUssdCode(trx, depot, montant);
  }

  ouvrirTelephone() {
    const code = this.buildUssdCode();
    if (!code) {
      this.errorService.info('Veuillez choisir Montant + Options valides.');
      return;
    }

    if (this.isMobile()) {
      const telLink = 'tel:' + encodeURIComponent(code);
      window.location.href = telLink;
    } else {
      // Desktop: copie dans le presse-papiers
      navigator.clipboard?.writeText(code).then(() => {
        this.errorService.info(`Code USSD copié : ${code}`);
      }).catch(() => {
        this.errorService.info(`Code USSD : ${code}`);
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

  requestSubmit(): void {
    if (this.isSubmitDisabled()) {
      this.errorService.info('Veuillez compléter le formulaire.');
      return;
    }
    this.showConfirm = true;
  }

  cancelConfirm(): void {
    this.showConfirm = false;
  }

  isSubmitDisabled(): boolean {
    const baseInvalid = !this.form.pays
      || !this.form.numero
      || !this.form.indicatif
      || !this.form.montant || this.form.montant <= 0
      || !this.form.optionDeTransaction
      || !this.form.optionDepot;

    if (this.isGuestMode) {
      return baseInvalid || !this.guestIdPlateforme.trim();
    }
    return baseInvalid || !this.userId;
  }

  async submitDepot() {
    if (this.isSubmitDisabled()) {
      this.errorService.info('Veuillez compléter le formulaire.');
      return;
    }

    this.submitting = true;

    try {
      const numeroComplet = `${this.form.indicatif}${this.form.numero}`;
      const fd = new FormData();
      fd.append('montant', String(this.form.montant!));
      fd.append('optionDepot', this.form.optionDepot);
      fd.append('pays', this.form.pays);
      fd.append('optionDeTransaction', this.form.optionDeTransaction);
      if (this.file) {
        fd.append('capture', this.file);
      }

      if (this.isGuestMode) {
        fd.append('numeroInvite', numeroComplet);
        if (this.guestNom.trim()) fd.append('nomInvite', this.guestNom.trim());
        if (this.guestPrenom.trim()) fd.append('prenomInvite', this.guestPrenom.trim());
        if (this.guestIdPlateforme.trim()) fd.append('idPlateforme', this.guestIdPlateforme.trim());
        await firstValueFrom(this.depotService.createInvite(fd));
      } else {
        fd.append('numeroEnvoyant', numeroComplet);
        await firstValueFrom(this.depotService.create(this.userId, fd));
      }

      this.errorService.success('Dépôt soumis avec succès !');
      this.showConfirm = false;
      this.resetForm();
      if (this.isGuestMode) { this.startCountdown(); }
    } catch (error: any) {
      this.errorService.handle(error, 'dépôt');
    } finally {
      this.submitting = false;
    }
  }

  private startCountdown() {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); }
    this.countdownSeconds = 180;
    this.showCountdown = true;
    this.countdownInterval = setInterval(() => {
      if (this.countdownSeconds > 0) {
        this.countdownSeconds--;
      } else {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); }
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
    ['file-camera', 'file-gallery'].forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.value = '';
    });
  }

  getSelectedPlatformId(): string {
    if (this.isGuestMode) return this.guestIdPlateforme;
    return this.transactionOptionsDisponibles.find(o => o.value === this.form.optionDeTransaction)?.id ?? '';
  }

  getOptionDepotText(option: string): string {
    return this.platform.getPaymentLabel(option);
  }

  getPlatformLogo(platform: string): string {
    return `assets/images/${platform}.png`;
  }
}

