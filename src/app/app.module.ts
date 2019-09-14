import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { TracksComponent } from './tracks/tracks.component';
import { HttpModule } from '@angular/http';
import { VideoObjectsService } from './video-objects.service';
import { LiveMonComponent } from './live-mon/live-mon.component';

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
    TracksComponent,
    LiveMonComponent
  ],
  imports: [
    BrowserModule,
    HttpModule,
    AppRoutingModule,
    NgbModule
  ],
  providers: [VideoObjectsService],
  bootstrap: [AppComponent]
})
export class AppModule { }
