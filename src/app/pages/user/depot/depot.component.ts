import { AuthService } from './../../../services/auth.service';
import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

      this.transactionOptionsDisponibles = [
        { label: '1XBET', value: '1XBET', id: user.id_1XBET },
        { label: 'BETWINNER', value: 'BETWINNER', id: user.id_BETWINNER },
        { label: 'MELBET', value: 'MELBET', id: user.id_MELBET },
        { label: '1WIN', value: '1WIN', id: user.id_1WIN }
      ].filter(opt => !!opt.id); // ❗ Garde seulement les options renseignées
    }
  }

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }

  onPaysChange() {
    const selected = this.paysOptions.find(p => p.nom === this.form.pays);
    this.form.indicatif = selected?.indicatif || '';
  }

  ouvrirTelephone() {
    const montant = this.form.montant;
    const depot = this.form.optionDepot;
    const transaction = this.form.optionDeTransaction;

    let code = '';

    if (depot === 'O') {
      switch (transaction) {
        case '1XBET': code = `*144*2*1*75000000*${montant}#`; break;
        case 'BETWINNER': code = `*144*2*1*75000011*${montant}#`; break;
        case 'MELBET': code = `*144*2*1*75000022*${montant}#`; break;
        case '1WIN': code = `*144*2*1*75000033*${montant}#`; break;
      }
    } else if (depot === 'M') {
      switch (transaction) {
        case '1XBET': code = `*555*2*1*72000000*${montant}#`; break;
        case 'BETWINNER': code = `*555*2*1*72000011*${montant}#`; break;
        case 'MELBET': code = `*555*2*1*72000022*${montant}#`; break;
        case '1WIN': code = `*555*2*1*72000033*${montant}#`; break;
      }
    } else if (depot === 'C') {
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
