import { Component, OnInit } from '@angular/core';

//import {VideoObjectsService} from '../video-objects.service'
//import {VideoSource,VideoArchive,VideoObjects,VideoTrack} from '../video-objects'
import {TracksService,TrackInfo} from '../tracks.service'
import { version } from 'punycode';

@Component({
  selector: 'app-tracks',
  templateUrl: './tracks.component.html',
  styleUrls: ['./tracks.component.css']
})
export class TracksComponent implements OnInit {
  errorMessage: string;
  public tracks: Array<TrackInfo>;

  constructor(private tracksService: TracksService) { 
    this.tracks=[];
  }

  ngOnInit() {
    this.tracksService.getTracks().subscribe(t => { this.tracks=t; },
      error => this.errorMessage=<any>error
  );

  }

}
