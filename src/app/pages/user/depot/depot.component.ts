import { AuthService } from './../../../services/auth.service';
import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-depot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
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

  paysOptions = [
    { nom: 'Burkina Faso', indicatif: '+226' },
    { nom: 'Côte d’Ivoire', indicatif: '+225' },
    { nom: 'Togo', indicatif: '+228' },
    { nom: 'Bénin', indicatif: '+229' }
  ];

  constructor(private http: HttpClient, private auth: AuthService) {
    const user = this.auth.getUser();
    if (user) this.userId = user.idUtilisateur;
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
    const option = this.form.optionDepot;

    let code = '';
    if (option === 'O') {
      code = `*144*2*1*75832474*${montant}#`;
    } else if (option === 'M') {
      code = `*555*2*1*72125222*${montant}#`;
    } else {
      alert("Cette méthode n'est pas encore disponible.");
      return;
    }

    const telLink = 'tel:' + encodeURIComponent(code);
    window.location.href = telLink;
  }



  submitDepot() {
    if (!this.file) return alert('Capture obligatoire');

    const formData = new FormData();
    const numeroComplet = this.form.indicatif + this.form.numero;

    formData.append('numeroEnvoyant', numeroComplet);
    formData.append('montant', this.form.montant?.toString() || '');
    formData.append('optionDepot', this.form.optionDepot);
    formData.append('pays', this.form.pays);
    formData.append('optionDeTransaction', this.form.optionDeTransaction);
    formData.append('capture', this.file);

    this.http.post(`http://192.168.244.230:8080/depots/user/${this.userId}`, formData).subscribe({
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

