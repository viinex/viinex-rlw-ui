import { Http, Response } from '@angular/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from "rxjs";
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/filter';

import {VideoObjectsService} from './video-objects.service'
import {VideoSource,VideoArchive,VideoObjects,VideoTrack,V1SVC_PATH} from './video-objects'

export class TrackInfo{
  public name: string;
  public displayName: string;
  public description: string;
  public channels: Array<string>;
  public liveSnapshotSources: Array<VideoSource>;
  public api: boolean;
}

export class Timestamps{
  public best?: number;
  public first: number;
  public last: number;
  public show: number;
}

export class ChanInfo{
  public video_source: string;
  public confidence: string;
  public timestamps: Timestamps;
}

export class RecResult{
  public track: string;
  public train_number: number;
  public result: string;
  public confidence: number;
  public cookie: number;
  public channels: Array<ChanInfo>;
  public timestamp_begin?: number;
  public timestamp_end?: number;

  public constructor(x: any){
    this.track=x.track;
    this.train_number=x.train_number;
    this.result=x.result;
    this.confidence=x.confidence;
    this.cookie=x.cookie;
    this.channels=x.channels.filter(c => c.timestamps != null);
    this.timestamp_begin=Math.min(...this.channels.map(c => c.timestamps.first));
    this.timestamp_end=Math.max(...this.channels.map(c => c.timestamps.last));
    for(let ci of this.channels){
      if(ci.timestamps.best){
        ci.timestamps.show=ci.timestamps.best;
      }
      else{
        ci.timestamps.show = Math.round((ci.timestamps.last + ci.timestamps.first)/2);
      }
    }
  }
}

export class TrainInfo{
  public track: string;
  public train_number: number;
  public channels: Array<string>;
  public timestamp_begin: number;
  public timestamp_end: number;
}

@Injectable({
  providedIn: 'root'
})
export class TracksService {

  constructor(private videoObjectsService: VideoObjectsService, private http: Http) { 

  }
  public getTracks(): Observable<Array<TrackInfo>>{
    return this.videoObjectsService.getObjects().map(objs => {
      let tracks =new  Array<TrackInfo>();
      for(var k in objs.meta){
        let obj=objs.meta[k];
        if(obj.type == "RailwayTrack"){
          let track=new TrackInfo();
          track.name=k;
          track.displayName=obj.name ? obj.name : k;
          track.description=obj.desc;
          track.channels=obj.channels;
          track.liveSnapshotSources=[];
          let ch = track.channels
          for(var vs in ch){
            var mvs=objs.videoSources.find(v => v.name===ch[vs]);
            if(mvs && mvs.getSnapshotImage){
              track.liveSnapshotSources.push(mvs);
            }
          }
          track.api=obj.api;
          tracks.push(track);
        }
      }
      tracks.sort((a,b)=> { if(a.name<b.name) return -1; else if(a.name>b.name) return 1; else return 0; });
      return tracks;
    });
  }
  public getTrack(trackName: string): Observable<TrackInfo>{
    return this.getTracks().map(ts => ts.find(t => t.name==trackName));
  }
  public trackResults(trackName: string): Observable<RecResult> {
    return this.videoObjectsService.webSocket
    .filter(x => x.topic=="RailcarNumberRecognition" && x.data.track==trackName)
    .map(x => new RecResult(x.data));
  }

  public sendRecognize(track: string, recognize: boolean, cookie: number){
    this.http.post(V1SVC_PATH+track, {recognize: recognize, cookie: cookie}).subscribe(r => { 
      let j=r.json();
      console.log(r);
      if(j && j.success) {
        console.debug("sendRecognize succeded at "+track);
      }
      else{
        console.warn("sendRecognize failed at "+track, j);
      }
    }, e => {
      console.error("sendRecognize failed at "+track, e);
    });
  }
  public getHistoryFromScript(track: string): Observable<Array<RecResult>>{
    return this.http.get(V1SVC_PATH+track).map(r => {
      let rr = [];
      let j=r.json();
      for(let x of j.last_railcars){
        if(x.train_number != j.train_number){ // берем все вагоны кроме относящихся к текущему составу
          rr.push(new RecResult(x));
        }
      }
      return rr;
    });
  }

  public getHistory(track: string, begin: Date, end: Date, recordsPerPage?: number, currentPage?: number) : Observable<Array<RecResult>>{
    return this.videoObjectsService.getObjects().mergeMap(objs => {
      if(objs.eventArchives.length>0){
        return objs.eventArchives[0].getEvents(begin,end,["RailcarNumberRecognition"],[track], recordsPerPage, (currentPage-1)*recordsPerPage)
          .map(a => a.map(x => new RecResult(x.data)));
      }
      else {
        return this.getHistoryFromScript(track);
      }
    });
  }
  public haveEventsArchive() : Observable<boolean>{
    return this.videoObjectsService.getObjects().map(objs => objs.eventArchives.length>0);
  }
  public getSummary(track: string, begin?: Date, end?: Date) : Observable<number>{
    return this.videoObjectsService.getObjects().mergeMap(objs => {
      if(objs.eventArchives.length>0){
        return objs.eventArchives[0].getSummary(begin,end).map(
          s => s.filter(x => x.origin==track && x.topic=="RailcarNumberRecognition").map(x => x.count).reduce((p,c) => p+c)
        );
      }
      else{
        return this.getHistoryFromScript(track).map(h => h.length);
      }
    });
  }

  public static produceTrains(track: TrackInfo, rr: Array<RecResult>): Array<RecResult | TrainInfo>{
    let res=new Array<RecResult | TrainInfo>();
    let ti : TrainInfo = null;
    for(let k=rr.length-1; k>=0; --k){
      let r = rr[k];
      if(ti == null || ti.train_number != r.train_number){
        if(ti){
          res.push(ti);
        }
        ti=new TrainInfo();
        ti.track=track.name;
        ti.train_number=r.train_number;
        ti.channels=track.channels;
        ti.timestamp_end=r.timestamp_end;
        ti.timestamp_begin=r.timestamp_begin;
      }
      else{
        ti.timestamp_begin=r.timestamp_begin;
      }
      res.push(r);
    }
    if(ti){
      res.push(ti);
    }
    return res.reverse();
  }
}
