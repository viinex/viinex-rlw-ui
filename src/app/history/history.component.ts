import { Component, OnInit, TemplateRef, Query } from '@angular/core';
import { ActivatedRoute,Router }       from '@angular/router';

import {VideoObjectsService} from '../video-objects.service'
import {TracksService,TrackInfo, RecResult, ChanInfo,Timestamps,TrainInfo} from '../tracks.service'
import { VideoSource } from '../video-objects';
import {VideoComponent} from './video/video.component';

import {NgbModal} from '@ng-bootstrap/ng-bootstrap';

import { Observable } from "rxjs/Observable";
import 'rxjs/add/operator/zip'
import { hasLifecycleHook } from '@angular/compiler/src/lifecycle_reflector';


@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  public track: TrackInfo;
  public videoSources: Map<string, VideoSource>;

  public lastResults: Array<RecResult | TrainInfo>;

  public selectedTrack : string;
  public selectedIndex?: number;
  public selectedResult: RecResult;
  public selectedTrain: TrainInfo;

  constructor(private route: ActivatedRoute, private router: Router, 
    private videoObjectsService: VideoObjectsService, private tracksService: TracksService,
    private modalService: NgbModal) { 
      this.selectedResult=null;
      this.selectedTrain=null;
      this.lastResults=[];
  }
  public navigateToRailcarIndex(i: number){
    this.router.navigate(['/history', this.track.name], {queryParams: {index: i}});
  }
  ngOnInit() {
    console.log("oninit");
    this.route.queryParams.subscribe(qp =>{
      this.selectedIndex=qp["index"];
      if(this.lastResults){
        this.selectedResult=this.castToRecResult(this.lastResults[this.selectedIndex]);
        this.selectedTrain=this.castToTrainInfo(this.lastResults[this.selectedIndex]);
      }
    });
    this.route.params.subscribe(params => {
      let selectedTrack=params["track"];
      if(this.track==null || this.track.name != selectedTrack){
        this.videoObjectsService.getObjects().subscribe(vo => {
          this.tracksService.getTrack(params["track"]).subscribe(track => { 
            this.track=track;
            this.videoSources=new Map<string, VideoSource>();
            for(let s of track.channels){
              let vs=vo.videoSources.find(vs => vs.name==s);
              if(vs){
                this.videoSources[s]=vs;
              }
            }
            this.tracksService.getHistory(selectedTrack).subscribe(r => {
              this.lastResults=TracksService.produceTrains(this.track, r);
              if(this.selectedIndex >= 0){
                this.selectedResult=this.castToRecResult(this.lastResults[this.selectedIndex]);
                this.selectedTrain=this.castToTrainInfo(this.lastResults[this.selectedIndex]);
              }
            });
          });
        });
      }
    });
  }

  public castToRecResult(r: any){
    if (r instanceof RecResult){
      return r as RecResult;
    }
    else {
      return null;
    }
  }
  public castToTrainInfo(r: any){
    if (r instanceof TrainInfo){
      return r as TrainInfo;
    }
    else {
      return null;
    }
  }

  public supplementaryChannels(r: RecResult) : Array<string>{
    let rc=r.channels.map(c => c.video_source);
    return this.track.channels.filter(c => !rc.includes(c));
  }

  public playVideo(cam: string, begin: number, end: number){
    //let tref=document.getElementsByName('playVideoElement').item(0);
    //console.log(tref);
    let m=this.modalService.open(VideoComponent, {size:'lg'});
    m.componentInstance.selectedChannel=this.videoSources[cam];
    m.componentInstance.timestampBegin = begin;
    m.componentInstance.timestampEnd = end;

    m.result.then(r => {
      console.log("playvideo modal closed", r);
    }).catch(r => {
      console.log("playvideo modal dismissed", r)
    });
  }

}
