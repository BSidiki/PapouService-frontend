import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly KEY = 'ps_tx_statuses';
  private _badgeCount = new BehaviorSubject<number>(0);
  badgeCount$ = this._badgeCount.asObservable();

  get badgeCount(): number { return this._badgeCount.value; }

  checkTransactions(rows: any[]): void {
    this.load().then(saved => {
      let count = 0;
      const updated: Record<string, string> = { ...saved };

      for (const tx of rows) {
        if (!tx.id_transaction || !tx.transaction) continue;
        const key = `${tx.transaction}-${tx.id_transaction}`;
        const prev = saved[key];
        const curr = tx.statut ?? 'PENDING';
        if (prev && prev !== 'VALIDATED' && curr === 'VALIDATED') count++;
        updated[key] = curr;
      }

      this._badgeCount.next(this._badgeCount.value + count);
      this.save(updated);
    });
  }

  clearBadge(): void {
    this._badgeCount.next(0);
  }

  private async load(): Promise<Record<string, string>> {
    try {
      const { value } = await Preferences.get({ key: this.KEY });
      return value ? JSON.parse(value) : {};
    } catch {
      return {};
    }
  }

  private save(data: Record<string, string>): void {
    Preferences.set({ key: this.KEY, value: JSON.stringify(data) });
  }
}
