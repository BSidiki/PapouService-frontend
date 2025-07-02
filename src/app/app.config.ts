import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { LoginComponent } from './pages/login/login.component';
import { provideHttpClient } from '@angular/common/http';
import { RegisterComponent } from './pages/register/register.component';
import { UserHomeComponent } from './pages/user/user-home.component';
import { authGuard } from './guards/auth.guard-guard';
import { roleGuard } from './guards/role-guard';
import { AdminHomeComponent } from './pages/admin/admin-home.component';
import { AccueilPublicComponent } from './pages/accueil/accueil-public.component';
import { AnnoncesPublicComponent } from './pages/annonces/annonces-public.component';
import { FaqComponent } from './pages/faq/faq.component';
import { ContactComponent } from './pages/contact/contact.component';
import { AProposComponent } from './pages/a-propos/a-propos.component';
import { ProfilComponent } from './pages/user/profil/profil.component';
import { DepotComponent } from './pages/user/depot/depot.component';
import { RetraitComponent } from './pages/user/retrait/retrait.component';
import { ChangerMdpComponent } from './pages/user/changer-mdp/changer-mdp.component';
import { HistoriqueComponent } from './pages/user/historique/historique.component';
import { DepotDetailComponent } from './pages/user/depot-detail/depot-detail.component';
import { RetraitDetailComponent } from './pages/user/retrait-detail/retrait-detail.component';
import { NotFoundComponent } from './pages/public/not-found.component';
import { AdminClientsComponent } from './pages/admin/admin-clients/admin-clients.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { AdminClientDetailComponent } from './pages/admin/admin-client-detail/admin-client-detail.component';
import { AdminClientHistoriqueComponent } from './pages/admin/admin-client-historique/admin-client-historique.component';
import { AdminClientDepotsComponent } from './pages/admin/admin-client-depots/admin-client-depots.component';
import { AdminClientRetraitsComponent } from './pages/admin/admin-client-retraits/admin-client-retraits.component';
import { AdminValidationsComponent } from './pages/admin/admin-validations/admin-validations.component';
import { AdminTransactionsComponent } from './pages/admin/admin-transactions/admin-transactions.component';
import { AdminAdministrateursComponent } from './pages/admin/admin-administrateurs/admin-administrateurs.component';
import { AdminAnnoncesComponent } from './pages/admin/admin-annonces/admin-annonces.component';
import { AdminAlbumsComponent } from './pages/admin/admin-albums/admin-albums.component';
import { AdminPubsComponent } from './pages/admin/admin-pubs/admin-pubs.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MotDePasseComponent } from './pages/mot-de-passe/mot-de-passe.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter([
      { path: '', redirectTo: 'accueil', pathMatch: 'full' },
      { path: 'accueil', component: AccueilPublicComponent },
      { path: 'faq', component: FaqComponent },
      { path: 'contact', component: ContactComponent },
      { path: 'a-propos', component: AProposComponent },
      { path: 'accueil/annonces', component: AnnoncesPublicComponent },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'mot-de-passe', component: MotDePasseComponent },
      {
        path: 'user',
        component: UserHomeComponent,
        canActivate: [authGuard, roleGuard],
        data: { expectedRole: 'USER' },
        children: [
          { path: '', redirectTo: 'profil', pathMatch: 'full' },
          { path: 'profil', component: ProfilComponent },
          { path: 'depot', component: DepotComponent },
          { path: 'retrait', component: RetraitComponent },
          { path: 'historique', component: HistoriqueComponent },
          { path: 'mot-de-passe', component: ChangerMdpComponent },
          {path: 'depot/:id', component: DepotDetailComponent},
          {path: 'retrait/:id', component: RetraitDetailComponent},
          { path: 'mot-de-passe', component: MotDePasseComponent },
        ]
      },
      {
        path: 'admin',
        component: AdminHomeComponent,
        canActivate: [authGuard, roleGuard],
        data: { expectedRole: 'ADMIN' },
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', component: DashboardComponent },
          { path: 'clients', component: AdminClientsComponent },
          { path: 'clients/:id', component: AdminClientDetailComponent },
          { path: 'clients/:id/historique', component: AdminClientHistoriqueComponent },
          { path: 'clients/:id/depots', component: AdminClientDepotsComponent },
          { path: 'clients/:id/retraits', component: AdminClientRetraitsComponent },
          { path: 'validations', component: AdminValidationsComponent },
          { path: 'transactions', component: AdminTransactionsComponent },
          { path: 'administrateurs', component: AdminAdministrateursComponent },
          { path: 'annonces', component: AdminAnnoncesComponent },
          { path: 'pubs', component: AdminPubsComponent },
          { path: 'mot-de-passe', component: MotDePasseComponent },
        ]
      },
      {
        path: '**',
        component: NotFoundComponent
      }
    ]),
    provideHttpClient()
  ]
};
