import { Injectable } from '@angular/core';
import { TransactionState } from '../models';
import { PlatformUtilsService } from './platform-utils.service';

export type ExportRow = {
  type: 'DEPOT' | 'RETRAIT';
  nom: string;
  numero: string;
  montant: number;
  plateforme: string;
  caisseOuId: string;
  moyen: string;
  statut: TransactionState;
  date?: string | null;
  isInvite: boolean;
};

@Injectable({ providedIn: 'root' })
export class ExportService {
  constructor(private platformUtils: PlatformUtilsService) {}

  private statutLabel(s: string): string {
    return s === 'VALIDATED' ? 'Validé' : s === 'REJECTED' ? 'Rejeté' : 'En attente';
  }

  async exportPdf(rows: ExportRow[], title = 'Transactions — Papou Service'): Promise<void> {
    if (!rows.length) return;

    let logoBase64 = '';
    try {
      const res  = await fetch('assets/images/logo.png');
      const blob = await res.blob();
      logoBase64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { /* continue sans logo */ }

    const now = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const tableRows = rows.map(r => `
      <tr>
        <td><span class="type-${r.type.toLowerCase()}">${r.type === 'DEPOT' ? 'Dépôt' : 'Retrait'}</span></td>
        <td>${r.nom || '—'}${r.isInvite ? ' <span class="invite">Invité</span>' : ''}</td>
        <td>${r.numero}</td>
        <td class="amount">${r.type === 'DEPOT' ? r.montant.toLocaleString('fr-FR') + ' FCFA' : '—'}</td>
        <td>${r.plateforme}</td>
        <td>${r.caisseOuId}</td>
        <td>${r.moyen}</td>
        <td class="s-${r.statut.toLowerCase()}">${this.statutLabel(r.statut)}</td>
        <td>${r.date ? new Date(r.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}</td>
      </tr>`).join('');

    const logoImg = logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Papou Service" />` : '';
    const watermarkCss = logoBase64
      ? `body::before { content:''; position:fixed; inset:0;
           background-image:url('${logoBase64}'); background-repeat:no-repeat;
           background-position:center center; background-size:340px auto;
           opacity:0.07; pointer-events:none; z-index:0; }`
      : '';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,sans-serif; font-size:11px; color:#1f2937; padding:24px; }
    ${watermarkCss}
    .doc-header,.doc-footer,table { position:relative; z-index:1; }
    .doc-header { display:flex; justify-content:space-between; align-items:center;
                  margin-bottom:18px; padding-bottom:12px; border-bottom:3px solid #991f23; }
    .brand { display:flex; align-items:center; gap:12px; }
    .logo  { height:50px; width:auto; object-fit:contain; }
    .brand h1 { font-size:17px; color:#991f23; margin-bottom:3px; }
    .brand .sub { font-size:10px; color:#4b5563; margin-top:2px; }
    .meta { text-align:right; font-size:10px; color:#6b7280; line-height:1.7; }
    table { width:100%; border-collapse:collapse; }
    th { background:#991f23; color:#fff; padding:7px 8px; text-align:left;
         font-size:9px; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap; }
    td { padding:6px 8px; border-bottom:1px solid #e6edf5; font-size:10px; vertical-align:middle; }
    tr:nth-child(even) td { background:#f6f7fb; }
    .type-depot   { color:#0369a1; font-weight:700; }
    .type-retrait { color:#991f23; font-weight:700; }
    .amount { font-weight:600; }
    .invite { background:#fef3c7; color:#92400e; padding:1px 5px; border-radius:4px; font-size:9px; }
    .s-validated { color:#16a34a; font-weight:700; }
    .s-rejected  { color:#dc2626; font-weight:700; }
    .s-pending   { color:#d97706; font-weight:700; }
    .doc-footer { margin-top:16px; font-size:9px; color:#9ca3af; text-align:center;
                  border-top:1px solid #e6edf5; padding-top:8px; }
    @media print {
      @page { margin:12mm; size:landscape; }
      body::before { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="brand">
      ${logoImg}
      <div>
        <h1>Rapport des Transactions</h1>
        <p class="sub">${rows.length} transaction(s) — filtres appliqués</p>
      </div>
    </div>
    <div class="meta">
      <div><strong>Papou Service — Administration</strong></div>
      <div>Exporté le ${now}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Type</th><th>Client</th><th>Numéro</th><th>Montant</th>
        <th>Plateforme</th><th>Caisse / ID</th><th>Moyen</th><th>Statut</th><th>Date</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="doc-footer">Papou Service — Document généré automatiquement le ${now}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank', 'width=1100,height=750');
    if (!win) { URL.revokeObjectURL(url); return; }
    win.addEventListener('afterprint', () => URL.revokeObjectURL(url));
    setTimeout(() => win.print(), 500);
  }

  exportCsv(rows: ExportRow[], filename = 'transactions'): void {
    if (!rows.length) return;

    const headers = ['Type', 'Client', 'Numéro', 'Montant (FCFA)', 'Plateforme', 'Statut', 'Date', 'Mode'];
    const lines = rows.map(r => [
      r.type === 'DEPOT' ? 'Dépôt' : 'Retrait',
      r.nom || '—',
      r.numero,
      r.montant,
      r.plateforme,
      this.statutLabel(r.statut),
      r.date ? new Date(r.date).toLocaleString('fr-FR') : '—',
      r.isInvite ? 'Invité' : 'Compte'
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));

    const bom = '\uFEFF';
    const csv = bom + [headers.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${filename}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
