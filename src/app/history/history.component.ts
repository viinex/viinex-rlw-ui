import { Component, OnInit, TemplateRef, Query } from '@angular/core';

import { ActivatedRoute,Router }       from '@angular/router';

import {VideoObjectsService} from '../video-objects.service'
import {TracksService,TrackInfo, RecResult, ChanInfo,Timestamps,TrainInfo} from '../tracks.service'
import { VideoSource } from '../video-objects';
import {VideoComponent} from './video/video.component';

import {NgbModal, NgbCollapse, NgbDate, NgbCalendar, NgbDateNativeAdapter, NgbDateStruct} from '@ng-bootstrap/ng-bootstrap';

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

  public haveEventsArchive : boolean;

  public searchBegin: Date;
  public searchEnd: Date;
  public searchNumber: string;
  public searchDistance: number;

  public isSearchCollapsed: boolean;

  hoveredDate: NgbDate | null = null;
  // fromDate: NgbDate;
  // toDate: NgbDate | null = null;
  public recordsPerPage : number = 200;
  public currentPage : number = 0;
  public totalRecords : number = 0;

  constructor(private route: ActivatedRoute, private router: Router, 
    private videoObjectsService: VideoObjectsService, private tracksService: TracksService,
    private modalService: NgbModal,
    private calendar: NgbCalendar
    ) { 
      this.selectedResult=null;
      this.selectedTrain=null;
      this.lastResults=[];

      this.searchEnd=new Date();
      this.searchBegin=new Date(this.searchEnd.valueOf() - 24*60*60);
      this.searchNumber="";
      this.searchDistance=0;

      this.isSearchCollapsed = true;

      this.toDate = calendar.getToday();
      this.fromDate = calendar.getPrev(calendar.getToday(), 'd', 7);
  }
  private dateAdapter: NgbDateNativeAdapter = new NgbDateNativeAdapter();

  public navigateToRailcarIndex(i: number){
    this.router.navigate(['/history', this.track.name], {queryParams: {index: i}});
  }
  ngOnInit() {
    console.log("oninit");
    this.tracksService.haveEventsArchive().subscribe( (v) => { 
      console.log(v);
      this.haveEventsArchive = v; });
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
            this.getSummary();
            this.getHistory();
          });
        });
      }
    });
  }

  public fromModel(x : Date) : NgbDateStruct {
    if(x==null){
      return null;
    }
    let v=new Date(x);
    v.setHours(12,0,0,0);
    return this.dateAdapter.fromModel(v); 
  }
  public toModel(x : NgbDateStruct, begin: boolean) : Date {
    if(x==null){
      return null;
    }
    let res=this.dateAdapter.toModel(x);
    if(begin){
      res.setHours(0,0,0,0);
    }
    else{
      res.setHours(23,59,59,999);
    }
    return res;
  }
  public get fromDate() : NgbDateStruct { return this.fromModel(this.searchBegin); }
  public set fromDate(date: NgbDateStruct){ this.searchBegin=this.toModel(date, true); }
  public get toDate() : NgbDateStruct { return this.fromModel(this.searchEnd); }
  public set toDate(date: NgbDateStruct){this.searchEnd=this.toModel(date, false); }

  // datepicker stuff
  public onDateSelection(date: NgbDate) {
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    } else if (this.fromDate && !this.toDate && !date.before(this.fromDate)) {
      this.toDate = date;
    } else {
      this.toDate = null;
      this.fromDate = date;
    }
  }
  isHovered(date: NgbDate) {
    return this.fromDate && !this.toDate && this.hoveredDate && date.after(this.fromDate) && date.before(this.hoveredDate);
  }
  isInside(date: NgbDate) {
    return this.toDate && date.after(this.fromDate) && date.before(this.toDate);
  }
  isRange(date: NgbDate) {
    return date.equals(this.fromDate) || (this.toDate && date.equals(this.toDate)) || this.isInside(date) || this.isHovered(date);
  }  
  //end datepicker stuff

  public getSummary(){
    this.tracksService.getSummary(this.track.name, new Date(this.searchBegin), new Date(this.searchEnd)).subscribe(r => { this.totalRecords = r; console.log(r); });
  }
  public getHistory(){
    this.tracksService.getHistory(this.track.name, new Date(this.searchBegin), new Date(this.searchEnd), this.recordsPerPage, this.currentPage).subscribe(r => {
      this.lastResults=TracksService.produceTrains(this.track, r);
      if(this.selectedIndex >= 0){
        this.selectedResult=this.castToRecResult(this.lastResults[this.selectedIndex]);
        this.selectedTrain=this.castToTrainInfo(this.lastResults[this.selectedIndex]);
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
