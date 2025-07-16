import { AuthService } from './../../../services/auth.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AnnoncesPublicComponent } from "../../annonces/annonces-public.component";
import { MatchsComponent } from "../../matchs/matchs.component";
import { FooterComponent } from "../../../layout/footer/footer.component";

@Component({
  selector: 'app-retrait',
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
  templateUrl: './retrait.component.html',
  styleUrls: ['./retrait.component.scss']
})
export class RetraitComponent {
  form: any = {
    numeroEnvoyant: '',
    pays: '',
    indicatif: '',
    optionRetrait: '',
    codeRetrait: '',
    montant: null,
    optionDeTransaction: ''
  };

  file!: File;
  userId: number = 0;
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
      ].filter(opt => !!opt.id); // ❗ garder que ceux renseignés
    }
  }

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }

  onPaysChange() {
    const selected = this.paysOptions.find(p => p.nom === this.form.pays);
    this.form.indicatif = selected?.indicatif || '';
  }

  submitRetrait() {
    if (!this.file) return alert('Capture obligatoire');
    const numeroComplet = this.form.indicatif + this.form.numeroEnvoyant;

    const formData = new FormData();
    formData.append('numeroEnvoyant', numeroComplet);
    formData.append('pays', this.form.pays);
    formData.append('optionRetrait', this.form.optionRetrait);
    formData.append('codeRetrait', this.form.codeRetrait);
    formData.append('montant', this.form.montant);
    formData.append('optionDeTransaction', this.form.optionDeTransaction);
    formData.append('file', this.file);

    this.http.post(`http://192.168.57.230:8080/retraitsuser/${this.userId}`, formData).subscribe({
      next: () => {
        alert('Retrait soumis avec succès !');
        this.form = {
          pays: '', indicatif: '', numeroEnvoyant: '', montant: null,
          codeRetrait: '', optionRetrait: '', optionDeTransaction: ''
        };
      },
      error: err => {
        console.error(err);
        alert('Erreur lors du retrait');
      }
    });
  }
}
