import { AuthService } from './../../../services/auth.service';
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AnnoncesPublicComponent } from "../../annonces/annonces-public.component";
import { MatchsComponent } from "../../matchs/matchs.component";
import { FooterComponent } from "../../../layout/footer/footer.component";

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
    AnnoncesPublicComponent,
    MatchsComponent,
    FooterComponent
  ],
  templateUrl: './depot.component.html',
  styleUrls: ['./depot.component.scss']
})
export class DepotComponent {
  form = {
    pays: '',
    indicatif: '',
    numero: '',
    montant: null as number | null,
    optionDepot: '',
    optionDeTransaction: ''
  };

  file!: File;
  userId: number = 0;
  ussdLink: string = '';
  transactionOptionsDisponibles: { label: string; value: string; id: string | null }[] = [];

  paysOptions = [
    { nom: 'Burkina Faso', indicatif: '+226' },
    { nom: 'Côte d’Ivoire', indicatif: '+225' },
    { nom: 'Togo', indicatif: '+228' },
    { nom: 'Bénin', indicatif: '+229' }
  ];

  constructor(private http: HttpClient, private auth: AuthService) {
    const user = this.auth.getUser();
    if (user) {
      this.userId = user.idUtilisateur;

      // Liste des plateformes visibles selon les ID fournis
      this.transactionOptionsDisponibles = [
        { label: '1XBET', value: '1XBET', id: user.id_1XBET },
        { label: 'BETWINNER', value: 'BETWINNER', id: user.id_BETWINNER },
        { label: 'MELBET', value: 'MELBET', id: user.id_MELBET },
        { label: '1WIN', value: '1WIN', id: user.id_1WIN },
        { label: '888STARZ', value: '888STARZ', id: user.id_888STARZ }
      ].filter(opt => !!opt.id); // On garde uniquement les options renseignées
    }
  }

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }

  onPaysChange() {
    const selected = this.paysOptions.find(p => p.nom === this.form.pays);
    this.form.indicatif = selected?.indicatif || '';
  }

  /**
   * Lancer l'USSD ou ouvrir les applications
   */
  ouvrirTelephone() {
    const montant = this.form.montant;
    const depot = this.form.optionDepot;
    const transaction = this.form.optionDeTransaction;
    let code = '';

    // ORANGE MONEY
    if (depot === 'O') {
      switch (transaction) {
        case '1XBET': code = `*144*2*1*75000000*${montant}#`; break;
        case 'BETWINNER': code = `*144*2*1*75000011*${montant}#`; break;
        case 'MELBET': code = `*144*2*1*75000022*${montant}#`; break;
        case '1WIN': code = `*144*2*1*75000033*${montant}#`; break;
        case '888STARZ': code = `*144*2*1*75000044*${montant}#`; break;
      }
    }
    // MOOV MONEY
    else if (depot === 'M') {
      switch (transaction) {
        case '1XBET': code = `*555*2*1*72000000*${montant}#`; break;
        case 'BETWINNER': code = `*555*2*1*72000011*${montant}#`; break;
        case 'MELBET': code = `*555*2*1*72000022*${montant}#`; break;
        case '1WIN': code = `*555*2*1*72000033*${montant}#`; break;
        case '888STARZ': code = `*144*2*1*75000044*${montant}#`; break;
      }
    }
    // WAVE
    else if (depot === 'W') {
      this.ouvrirWave();
      return;
    }
    // SANK MONEY
    else if (depot === 'S') {
      this.ouvrirSankMoney();
      return;
    }
    // Autres
    else if (depot === 'C') {
      alert("❌ Cette méthode n'est pas encore disponible.");
      return;
    }

    if (code) {
      const telLink = 'tel:' + encodeURIComponent(code);
      window.location.href = telLink;
    } else {
      alert("⚠️ Veuillez sélectionner une combinaison valide.");
    }
  }

  /**
   * Ouvrir l'application WAVE ou rediriger vers le Play Store
   */
  ouvrirWave() {
    // Pour Android
    if (/Android/i.test(navigator.userAgent)) {
        window.location.href = 'intent://open/#Intent;package=com.wave.personal;scheme=wave;end';
    }
    // Pour iOS
    else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = 'wave://';
        setTimeout(() => {
            window.location.href = 'https://apps.apple.com/app/wave-...';
        }, 500);
    }
    // Fallback
    else {
        window.open('https://wave.com', '_blank');
    }
}

ouvrirSankMoney() {
  // Essayez plusieurs schemes possibles
  const schemes = [
      'sankmoney://',
      'com.sankmoney.app://',
      'sank-money://'
  ];

  this.tryMultipleSchemes(schemes,
      'https://play.google.com/store/apps/details?id=com.sankmoney.app',
      'https://apps.apple.com/app/sank-money/idXXXXXXXXXX'
  );
}

private tryMultipleSchemes(schemes: string[], androidFallback: string, iosFallback: string) {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const fallback = isIOS ? iosFallback : androidFallback;

  let tried = 0;
  const tryNext = () => {
      if (tried >= schemes.length) {
          window.open(fallback, '_blank');
          return;
      }

      console.log('Essai avec scheme:', schemes[tried]);
      window.location.href = schemes[tried];
      tried++;

      setTimeout(tryNext, 300);
  };

  tryNext();
}

  /**
   * Tentative d'ouverture d'une application, sinon redirection vers le store
   */
  private tryOpenApp(appUrl: string, fallbackUrl: string) {
    // Ouvrir dans un nouvel onglet pour éviter les problèmes de blocage
    const newWindow = window.open(appUrl, '_blank');

    // Vérifier après un délai si la fenêtre est toujours là (échec)
    setTimeout(() => {
        if (newWindow && newWindow.closed === false) {
            newWindow.close();
            window.open(fallbackUrl, '_blank');
        }
    }, 500);
}

  /**
   * Soumission du dépôt
   */
  submitDepot() {
    if (!this.file) return alert('Capture obligatoire');

    const numeroComplet = this.form.indicatif + this.form.numero;
    const formData = new FormData();

    formData.append('numeroEnvoyant', numeroComplet);
    formData.append('montant', this.form.montant?.toString() || '');
    formData.append('optionDepot', this.form.optionDepot);
    formData.append('pays', this.form.pays);
    formData.append('optionDeTransaction', this.form.optionDeTransaction);
    formData.append('capture', this.file);

    this.http.post(`http://192.168.57.230:8080/depots/user/${this.userId}`, formData).subscribe({
      next: () => {
        alert('Dépôt soumis avec succès !');
        this.form = { pays: '', indicatif: '', numero: '', montant: null, optionDepot: '', optionDeTransaction: '' };
      },
      error: err => {
        console.error(err);
        alert('Erreur lors du dépôt');
      }
    });
  }
}
