import { Component, OnInit, TemplateRef, Query } from '@angular/core';

import { ActivatedRoute,Router,Params }       from '@angular/router';

import {VideoObjectsService} from '../video-objects.service'
import {TracksService,TrackInfo, RecResult, ChanInfo,Timestamps,TrainInfo, HistoryData} from '../tracks.service'
import { VideoSource } from '../video-objects';
import {VideoComponent} from './video/video.component';

import {NgbModal, NgbCollapse, NgbDate, NgbCalendar, NgbDateNativeAdapter, NgbDateStruct} from '@ng-bootstrap/ng-bootstrap';

import { Observable } from "rxjs/Observable";
import { combineLatest } from 'rxjs';

import { hasLifecycleHook } from '@angular/compiler/src/lifecycle_reflector';


@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  public track: TrackInfo = null;
  public videoSources: Map<string, VideoSource>;

  public historyData: HistoryData = null;
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
      this.recordsPerPage=1000;
      this.currentPage=1;

      this.isSearchCollapsed = true;

      this.toDate = calendar.getToday();
      this.fromDate = calendar.getPrev(calendar.getToday(), 'd', 7);
  }
  private dateAdapter: NgbDateNativeAdapter = new NgbDateNativeAdapter();

  public navigateToRailcarIndex(i: number){
    //this.router.navigate(['/history', this.track.name], {queryParams: {index: i}});
    this.navigateTo(this.track.name, i);
  }
  public navigateTo(track: string, index?: number, page?: number, pageSize?: number, begin?: Date, end?: Date){
    let endf = end ? new Date(end) : (this.searchEnd? new Date(this.searchEnd) : new Date());
    let beginf = (end && begin) ? new Date(begin) : (this.searchEnd && this.searchBegin ? new Date(this.searchBegin) : new Date(endf.valueOf() - 24*60*60));
    let pagef = (isFinite(page) && (page > 0)) ? page : (isFinite(this.currentPage) && (this.currentPage>0) ? this.currentPage : 1);
    let pageSizef = (isFinite(pageSize) && (pageSize > 0)) ? pageSize : (isFinite(this.recordsPerPage) && (this.recordsPerPage>0) ? this.recordsPerPage : 1000);

    let qp = {
      begin: beginf.toISOString(),
      end: endf.toISOString(),
      pageSize: pageSizef,
      page: pagef,
      index: index
    };
    console.log("navigateTo: qp=", qp);

    this.router.navigate(["/history", track], {queryParams: qp});
  }
  public navigate(){
    console.log("naviagate", this.selectedTrack, this.currentPage, this.recordsPerPage, this.searchBegin, this.searchEnd);
    this.navigateTo(this.selectedTrack, 0, this.currentPage, this.recordsPerPage, this.searchBegin, this.searchEnd);
  }

  public updateModelToLocation(params: Params, queryParams: Params){
    console.log("updateModelToLocation",params, queryParams);
    this.selectedTrack = params["track"];
    this.currentPage = queryParams["page"];
    this.recordsPerPage = queryParams["pageSize"];
    this.searchBegin = new Date(queryParams["begin"]);
    this.searchEnd = new Date(queryParams["end"]);
    this.selectedIndex=queryParams["index"];

    console.log("updateModelToLocation", this.selectedTrack, this.currentPage, this.recordsPerPage, this.searchBegin, this.searchEnd);
    if(this.historyData){
      console.log("this.historyData",this.historyData.track, this.historyData.searchBegin, this.historyData.searchEnd, this.historyData.currentPage, this.historyData.recordsPerPage);
      console.log(this.historyData.track != this.selectedTrack);
      console.log(this.historyData.searchBegin.valueOf() != this.searchBegin.valueOf());
      console.log(this.historyData.searchEnd.valueOf() != this.searchEnd.valueOf());
      console.log(this.historyData.currentPage != this.currentPage);
      console.log(this.historyData.recordsPerPage != this.recordsPerPage);
    }

    let shouldUpdateModel : boolean = false ||
      (this.historyData == null) ||
      (this.historyData.track != this.selectedTrack) ||
      (this.historyData.searchBegin.valueOf() != this.searchBegin.valueOf()) ||
      (this.historyData.searchEnd.valueOf() != this.searchEnd.valueOf()) ||
      (this.historyData.currentPage != this.currentPage) ||
      (this.historyData.recordsPerPage != this.recordsPerPage);

    console.log("sohouldUPdateModel=",shouldUpdateModel);

    if(shouldUpdateModel){
      this.videoObjectsService.getObjects().subscribe(vo => {
        console.log(params,queryParams);
        this.tracksService.getTrack(this.selectedTrack).subscribe(track => { 
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
    else{
      console.log("historyData:", this.historyData);
      console.log("lastResults:", this.lastResults);
      console.log("selectedIndex: ", this.selectedIndex);
      this.selectedResult=this.castToRecResult(this.lastResults[this.selectedIndex]);
      this.selectedTrain=this.castToTrainInfo(this.lastResults[this.selectedIndex]);
      console.log("selectedResult=",this.selectedResult);
      console.log("selectedTrain=",this.selectedTrain);
    }

  }

  ngOnInit() {
    console.log("oninit");
    this.tracksService.haveEventsArchive().subscribe( (v) => { 
      console.log(v);
      this.haveEventsArchive = v; 
      if(!this.haveEventsArchive){
        this.route.queryParams.subscribe(qp =>{
          this.selectedIndex=qp["index"];
          if(this.lastResults){
            this.selectedResult=this.castToRecResult(this.lastResults[this.selectedIndex]);
            this.selectedTrain=this.castToTrainInfo(this.lastResults[this.selectedIndex]);
          }
        });
      }
      else{
        combineLatest(this.route.params, this.route.queryParams).subscribe((p) => {
          let [params, queryParams] = p;
          if(queryParams["end"] && queryParams["begin"]){
            this.updateModelToLocation(params, queryParams);
          }
          else{
            this.navigateTo(params["track"]);
          }
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
    if(this.track == null || this.searchBegin==null || this.searchEnd==null){
      return;
    }
    this.tracksService.getSummary(this.track.name, new Date(this.searchBegin), new Date(this.searchEnd)).subscribe(r => { this.totalRecords = r; console.log(r); });
  }
  public getHistory(){
    if(this.track == null || this.searchBegin==null || this.searchEnd==null){
      return;
    }
    this.tracksService.getHistory(this.track.name, new Date(this.searchBegin), new Date(this.searchEnd), this.recordsPerPage, this.currentPage).subscribe(h => {
      this.historyData=h;
      this.lastResults=TracksService.produceTrains(this.track, this.historyData.results);
      console.log("got history", this.lastResults);
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

  public onImgError(event){
    event.target.src='./assets/novideo.png';
  }
}
