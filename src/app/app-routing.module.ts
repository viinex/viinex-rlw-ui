import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NotFoundComponent } from './not-found/not-found.component';
import { TracksComponent } from './tracks/tracks.component';
import { LiveMonComponent } from './live-mon/live-mon.component';
import { HistoryComponent } from './history/history.component';
import { LoginGuardService } from './login-guard.service';
import { LoginComponent } from './login.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'tracks', component: TracksComponent, canActivate: [LoginGuardService] },
  { path: 'live-mon/:track', component: LiveMonComponent, canActivate: [LoginGuardService] },
  { path: 'history/:track', component: HistoryComponent, canActivate: [LoginGuardService] },
  { path: '', redirectTo: '/tracks', pathMatch: 'full', canActivate: [LoginGuardService] },
  { path: "**", component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
