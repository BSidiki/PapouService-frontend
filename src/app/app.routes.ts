import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard-guard';
import { roleGuard } from './guards/role-guard';
import { loggedInGuard } from './guards/logged-in.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'accueil', pathMatch: 'full' },

  // ── Public ─────────────────────────────────────────────────────────────
  { path: 'accueil',          loadComponent: () => import('./pages/accueil/accueil-public.component').then(m => m.AccueilPublicComponent) },
  { path: 'faq',              loadComponent: () => import('./pages/faq/faq.component').then(m => m.FaqComponent) },
  { path: 'contact',          loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent) },
  { path: 'a-propos',         loadComponent: () => import('./pages/a-propos/a-propos.component').then(m => m.AProposComponent) },
  { path: 'accueil/annonces', loadComponent: () => import('./pages/annonces/annonces-public.component').then(m => m.AnnoncesPublicComponent) },
  { path: 'matchs',           loadComponent: () => import('./pages/matchs/matchs.component').then(m => m.MatchsComponent) },
  { path: 'depot',            loadComponent: () => import('./pages/user/depot/depot.component').then(m => m.DepotComponent) },
  { path: 'retrait',          loadComponent: () => import('./pages/user/retrait/retrait.component').then(m => m.RetraitComponent) },

  // ── Auth ───────────────────────────────────────────────────────────────
  { path: 'login',        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [loggedInGuard] },
  { path: 'register',     loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
  { path: 'mot-de-passe', loadComponent: () => import('./pages/mot-de-passe/mot-de-passe.component').then(m => m.MotDePasseComponent) },

  // ── User ───────────────────────────────────────────────────────────────
  {
    path: 'user',
    loadComponent: () => import('./pages/user/home/user-home.component').then(m => m.UserHomeComponent),
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: 'USER' },
    children: [
      { path: '', redirectTo: 'profil', pathMatch: 'full' },
      { path: 'profil',       loadComponent: () => import('./pages/user/profil/profil.component').then(m => m.ProfilComponent) },
      { path: 'depot',        loadComponent: () => import('./pages/user/depot/depot.component').then(m => m.DepotComponent) },
      { path: 'retrait',      loadComponent: () => import('./pages/user/retrait/retrait.component').then(m => m.RetraitComponent) },
      { path: 'historique',   loadComponent: () => import('./pages/user/historique/historique.component').then(m => m.HistoriqueComponent) },
      { path: 'depot/:id',    loadComponent: () => import('./pages/user/depot-detail/depot-detail.component').then(m => m.DepotDetailComponent) },
      { path: 'retrait/:id',  loadComponent: () => import('./pages/user/retrait-detail/retrait-detail.component').then(m => m.RetraitDetailComponent) },
      { path: 'parrainage',   loadComponent: () => import('./pages/user/parrainage/parrainage.component').then(m => m.ParrainageComponent) },
      { path: 'mot-de-passe', loadComponent: () => import('./pages/mot-de-passe/mot-de-passe.component').then(m => m.MotDePasseComponent) },
    ]
  },

  // ── Admin ──────────────────────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin-home/admin-home.component').then(m => m.AdminHomeComponent),
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: 'ADMIN' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',       loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'clients',         loadComponent: () => import('./pages/admin/admin-clients/admin-clients.component').then(m => m.AdminClientsComponent) },
      { path: 'clients/:id',     loadComponent: () => import('./pages/admin/admin-client-detail/admin-client-detail.component').then(m => m.AdminClientDetailComponent) },
      { path: 'clients/:id/historique', loadComponent: () => import('./pages/admin/admin-client-historique/admin-client-historique.component').then(m => m.AdminClientHistoriqueComponent) },
      { path: 'clients/:id/depots',     loadComponent: () => import('./pages/admin/admin-client-depots/admin-client-depots.component').then(m => m.AdminClientDepotsComponent) },
      { path: 'clients/:id/retraits',   loadComponent: () => import('./pages/admin/admin-client-retraits/admin-client-retraits.component').then(m => m.AdminClientRetraitsComponent) },
      { path: 'validations',     loadComponent: () => import('./pages/admin/admin-validations/admin-validations.component').then(m => m.AdminValidationsComponent) },
      { path: 'transactions',    loadComponent: () => import('./pages/admin/admin-transactions/admin-transactions.component').then(m => m.AdminTransactionsComponent) },
      { path: 'administrateurs', loadComponent: () => import('./pages/admin/admin-administrateurs/admin-administrateurs.component').then(m => m.AdminAdministrateursComponent) },
      { path: 'annonces',        loadComponent: () => import('./pages/admin/admin-annonces/admin-annonces.component').then(m => m.AdminAnnoncesComponent) },
      { path: 'pubs',            loadComponent: () => import('./pages/admin/admin-pubs/admin-pubs.component').then(m => m.AdminPubsComponent) },
      { path: 'parrainage',      loadComponent: () => import('./pages/admin/admin-parrainage/admin-parrainage.component').then(m => m.AdminParrainageComponent) },
      { path: 'mot-de-passe',    loadComponent: () => import('./pages/mot-de-passe/mot-de-passe.component').then(m => m.MotDePasseComponent) },
    ]
  },

  { path: '**', loadComponent: () => import('./pages/public/not-found.component').then(m => m.NotFoundComponent) }
];
