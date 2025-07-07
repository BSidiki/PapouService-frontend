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
    AnnoncesPublicComponent
],
  templateUrl: './retrait.component.html',
  styleUrls: ['./retrait.component.scss']
})
export class RetraitComponent {
  form: any = {
    numeroEnvoyant: '',
    pays: '',
    optionRetrait: '',
    codeRetrait: '',
    montant: null,
    optionDeTransaction: ''
  };

  file!: File;
  userId: number = 0;

  paysOptions = [
    { nom: 'Burkina Faso', indicatif: '+226' },
    { nom: 'Côte d’Ivoire', indicatif: '+225' },
    { nom: 'Togo', indicatif: '+228' },
    { nom: 'Bénin', indicatif: '+229' }
  ];
  retraitForm: any;

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

  /* envoyer() {
    const formData = new FormData();
    formData.append('numeroEnvoyant', this.form.numeroEnvoyant);
    formData.append('pays', this.form.pays);
    formData.append('optionRetrait', this.form.optionRetrait); // "O", "M", "C"
    formData.append('codeRetrait', this.form.codeRetrait);
    formData.append('montant', this.form.montant);
    formData.append('optionDeTransaction', this.form.optionDeTransaction); // "1XBET" etc.
    formData.append('capture', this.file);

    this.http.post(`http://localhost:8080/retraitsuser/${this.userId}`, formData)
      .subscribe({
        next: (res) => {
          alert('Retrait envoyé avec succès');
          this.form = {}; this.file;
        },
        error: (err) => {
          console.error(err);
          alert("Erreur lors de l'envoi du retrait");
        }
      });
  } */

      submitRetrait() {
        if (!this.file) return alert('Capture obligatoire');

        const formData = new FormData();
        const numeroComplet = this.form.indicatif + this.form.numero;

        formData.append('numeroEnvoyant', numeroComplet);
        formData.append('pays', this.form.pays);
        formData.append('optionRetrait', this.form.optionRetrait);
        formData.append('codeRetrait', this.form.codeRetrait); // ← important
        formData.append('montant', this.form.montant);
        formData.append('optionDeTransaction', this.form.optionDeTransaction);

        // 🔴 Le champ s'appelle "file" côté backend !
        formData.append('file', this.file);

        this.http.post(`http://192.168.11.100:8080/retraitsuser/${this.userId}`, formData).subscribe({
          next: () => {
            alert('Retrait soumis avec succès !');
            this.form = {
              pays: '', indicatif: '', numero: '', montant: null,
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
