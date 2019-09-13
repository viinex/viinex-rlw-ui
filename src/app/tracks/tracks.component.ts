import { Component, OnInit } from '@angular/core';

import {VideoObjectsService} from '../video-objects.service'
import {VideoSource,VideoArchive,VideoObjects,VideoTrack} from '../video-objects'

@Component({
  selector: 'app-tracks',
  templateUrl: './tracks.component.html',
  styleUrls: ['./tracks.component.css']
})
export class TracksComponent implements OnInit {
  errorMessage: string;
  videoSources: VideoSource[];
  videoArchives: VideoArchive[];

  constructor(private videoObjectsService: VideoObjectsService) { }

  ngOnInit() {
    this.videoObjectsService.getObjects().subscribe(
      objs => {
          this.videoSources=objs.videoSources;
          this.videoArchives=objs.videoArchives;
      },
      error => this.errorMessage=<any>error
  );

  }

}
