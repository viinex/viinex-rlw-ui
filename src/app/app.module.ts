import { BrowserModule } from '@angular/platform-browser';
import { NgModule, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';

import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { TracksComponent } from './tracks/tracks.component';
import { HttpModule } from '@angular/http';
import { VideoObjectsService } from './video-objects.service';
import { LiveMonComponent } from './live-mon/live-mon.component';
import { HistoryComponent } from './history/history.component';
import { VideoComponent } from './history/video/video.component';
import { CookieService } from 'ngx-cookie-service';
import { LoginGuardService } from './login-guard.service';
import { LoginComponent } from './login.component';
import { LoginService } from './login.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';

registerLocaleData(localeRu, 'ru');

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
    TracksComponent,
    LiveMonComponent,
    HistoryComponent,
    VideoComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    HttpModule,
    AppRoutingModule,
    NgbModule,
    FormsModule,
    HttpClientModule,
  ],
  providers: [VideoObjectsService, CookieService, LoginGuardService, LoginService, HttpClient,
    { provide: LOCALE_ID, useValue: "en-US" }
  ],
  bootstrap: [AppComponent],
  entryComponents:[VideoComponent]
})
export class AppModule { }
