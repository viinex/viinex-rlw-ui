import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NotFoundComponent } from './not-found/not-found.component';
import { TracksComponent } from './tracks/tracks.component';
import { LiveMonComponent } from './live-mon/live-mon.component';


const routes: Routes = [
  { path: 'tracks', component: TracksComponent },
  { path: 'live-mon/:track', component: LiveMonComponent },
  { path: '', redirectTo: '/tracks', pathMatch: 'full' },
  { path: "**", component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
