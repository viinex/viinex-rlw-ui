import { Component, OnInit, OnDestroy } from '@angular/core';

import { ActivatedRoute,Router }       from '@angular/router';

import { Observable } from "rxjs/Observable";
import 'rxjs/add/operator/switchMap'


import {VideoObjectsService} from '../video-objects.service'
import {VideoSource,VideoArchive,VideoObjects,VideoTrack} from '../video-objects'
import {TracksService,TrackInfo} from '../tracks.service'


@Component({
  selector: 'app-live-mon',
  templateUrl: './live-mon.component.html',
  styleUrls: ['./live-mon.component.css']
})
export class LiveMonComponent implements OnInit {

  public track: TrackInfo;

  constructor(private route: ActivatedRoute, private router: Router, 
    private videoObjectsService: VideoObjectsService, private tracksService: TracksService) { }

  ngOnInit() {
    this.route.params.switchMap(params => 
      this.tracksService.getTrack(params["track"]))
      .subscribe(track => { 
        this.track=track;
      // this.videoSource=vs; 
      // this.startPlayback(); 
      // this.subscribeStreamDetails(vs.getStreamDetails);
  });
}

}
