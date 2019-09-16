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
}

export class ChanInfo{
  public video_source: string;
  public confidence: string;
  public timestamps: Timestamps;
}

export class RecResult{
  public track: string;
  public result: string;
  public confidence: number;
  public cookie: number;
  public channels: Array<ChanInfo>;

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
    .map(x => x.data);
  }

  public sendRecognize(track: string, recognize: boolean, cookie: number){
    this.http.post(V1SVC_PATH+track, {recognize: recognize, cookie: cookie}).subscribe(r => { 
      let j=r.json();
      if(j.success) {
        console.debug("sendRecognize succeded at "+track);
      }
      else{
        console.warn("sendRecognize failed at "+track+": "+j.error);
      }
    }, e => {
      console.error("sendRecognize failed at "+track, e);
    });
  }
}
