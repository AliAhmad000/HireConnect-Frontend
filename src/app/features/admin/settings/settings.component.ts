import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>Platform Settings</h1>
          <p>Configure admin preferences for this browser.</p>
        </div>
      </div>

      <section class="settings-card">
        <div class="section-header">
          <div>
            <h2>Admin Preferences</h2>
            <p>Control notification, refresh, and list display behavior.</p>
          </div>
          <span class="material-symbols-rounded">admin_panel_settings</span>
        </div>

        <div class="settings-list">
          <label class="setting-row">
            <div class="setting-copy">
              <span class="setting-icon email"><span class="material-symbols-rounded">mail</span></span>
              <div>
                <strong>Email alerts</strong>
                <span>Receive important platform activity updates.</span>
              </div>
            </div>
            <input type="checkbox" class="toggle" [(ngModel)]="settings.emailAlerts">
          </label>

          <label class="setting-row">
            <div class="setting-copy">
              <span class="setting-icon refresh"><span class="material-symbols-rounded">sync</span></span>
              <div>
                <strong>Auto refresh dashboards</strong>
                <span>Keep admin dashboards updated while open.</span>
              </div>
            </div>
            <input type="checkbox" class="toggle" [(ngModel)]="settings.autoRefresh">
          </label>

          <label class="setting-row page-size">
            <div class="setting-copy">
              <span class="setting-icon table"><span class="material-symbols-rounded">table_rows</span></span>
              <div>
                <strong>Default page size</strong>
                <span>Number of records loaded in admin tables.</span>
              </div>
            </div>
            <input type="number" min="10" max="500" [(ngModel)]="settings.pageSize">
          </label>
        </div>

        <div class="actions">
          <button type="button" (click)="save()">
            <span class="material-symbols-rounded">save</span>
            Save Settings
          </button>
          <p class="saved" *ngIf="saved">
            <span class="material-symbols-rounded">check_circle</span>
            Settings saved.
          </p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1280px; margin: 0 auto; padding: 32px 24px; color: #172033; }
    .page-header { margin-bottom: 1.5rem; }
    h1 { margin: 0 0 .35rem; color: #111827; font-size: clamp(1.875rem,3vw,2.25rem); line-height: 1.15; }
    p { margin: 0; color: #667085; }
    .settings-card { max-width: 900px; background: #fff; border: 1px solid #e5e9f2; border-radius: 8px; padding: 20px; box-shadow: 0 8px 24px rgba(15,23,42,.06); }
    .section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding-bottom: 18px; border-bottom: 1px solid #f3f4f6; }
    .section-header > .material-symbols-rounded { display: inline-flex; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: 8px; background: #eff6ff; color: #2563eb; }
    h2 { margin: 0 0 .35rem; color: #111827; font-size: 1.125rem; }
    .settings-list { display: grid; gap: 0; }
    .setting-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 18px 0; border-bottom: 1px solid #f3f4f6; }
    .setting-copy { display: flex; align-items: center; gap: 14px; }
    .setting-copy strong { display: block; color: #111827; margin-bottom: .2rem; }
    .setting-copy span:not(.material-symbols-rounded):not(.setting-icon) { color: #667085; font-size: .875rem; }
    .setting-icon { display: inline-flex; width: 44px; height: 44px; flex: 0 0 44px; align-items: center; justify-content: center; border-radius: 8px; }
    .setting-icon.email { background: #eef2ff; color: #4f46e5; } .setting-icon.refresh { background: #ecfdf3; color: #16a34a; } .setting-icon.table { background: #fffbeb; color: #d97706; }
    .toggle { width: 44px; height: 24px; accent-color: #2563eb; cursor: pointer; }
    .page-size input { width: 120px; border: 1px solid #d0d5dd; border-radius: 8px; padding: .65rem .75rem; font: inherit; }
    .actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; padding-top: 20px; }
    button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid #2563eb; border-radius: 8px; background: #2563eb; color: #fff; padding: .75rem 1rem; cursor: pointer; font-weight: 700; }
    .saved { display: inline-flex; align-items: center; gap: 6px; color: #166534; font-weight: 700; }
    .saved .material-symbols-rounded { font-size: 1.1rem; }
    @media (max-width: 768px) { .admin-page { padding: 24px 16px; } .setting-row { align-items: flex-start; flex-direction: column; } button { width: 100%; } }
  `],
})
export class SettingsComponent implements OnInit {
  settings = { emailAlerts: true, autoRefresh: false, pageSize: 100 };
  saved = false;

  ngOnInit(): void {
    const stored = localStorage.getItem('adminSettings');
    if (stored) this.settings = { ...this.settings, ...JSON.parse(stored) };
  }

  save(): void {
    localStorage.setItem('adminSettings', JSON.stringify(this.settings));
    this.saved = true;
  }
}
