import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LOCALE_ID } from '@angular/core';
import localeFr from '@angular/common/locales/fr';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeFr);

bootstrapApplication(App, {
  ...appConfig,
  providers: [{ provide: LOCALE_ID, useValue: 'fr' },...(appConfig.providers || []), provideAnimations()],
})
  .catch((err) => console.error(err));
