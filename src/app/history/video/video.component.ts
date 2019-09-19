import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import * as Hls from 'hls.js';
import { VideoSource } from 'src/app/video-objects';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.css']
})
export class VideoComponent implements OnInit, OnDestroy {

  constructor(public activeModal: NgbActiveModal) { }

  @Input() public selectedChannel : VideoSource;
  @Input() public timestampBegin : number;
  @Input() public timestampEnd : number;

  private hls: Hls;
  public streamURL: string;

  ngOnInit() {
    this.streamURL=this.selectedChannel.videoTracks[0].getHls(this.timestampBegin,this.timestampEnd);
    let video = document.getElementById("videoElement") as HTMLVideoElement;

    if (Hls.isSupported) {
        let hls = new Hls();
        hls.loadSource(this.streamURL);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            //video.play();
        });
        this.hls=hls;
    }
  }
  ngOnDestroy(){
    this.hls.destroy();
  }
  public dismiss(){
    this.activeModal.dismiss();
  }

}
