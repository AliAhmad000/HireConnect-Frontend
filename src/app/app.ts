// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './core/components/header/header.component';
import { FooterComponent } from './core/components/footer/footer.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <div class="hc-app-shell">
      <app-header></app-header>
      <main class="hc-main-shell">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    .hc-app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .hc-main-shell {
      flex: 1;
      padding-top: 110px;
    }

    @media (max-width: 760px) {
      .hc-main-shell {
        padding-top: 96px;
      }
    }
  `]
})
export class AppComponent {
  title = 'HireConnect';
}
