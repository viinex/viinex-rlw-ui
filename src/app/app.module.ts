import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { TracksComponent } from './tracks/tracks.component';
import { HttpModule } from '@angular/http';
import { VideoObjectsService } from './video-objects.service';

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
    TracksComponent
  ],
  imports: [
    BrowserModule,
    HttpModule,
    AppRoutingModule
  ],
  providers: [VideoObjectsService],
  bootstrap: [AppComponent]
})
export class AppModule { }
