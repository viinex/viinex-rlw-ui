import { Injectable } from '@angular/core';
import { Observable } from "rxjs";
import 'rxjs/add/operator/map';

import {VideoObjectsService} from './video-objects.service'
import {VideoSource,VideoArchive,VideoObjects,VideoTrack} from './video-objects'

export class TrackInfo{
  public name: string;
  public displayName: string;
  public description: string;
  public channels: Array<string>;
  public liveSnapshotSources: Array<VideoSource>;
}

@Injectable({
  providedIn: 'root'
})
export class TracksService {

  constructor(private videoObjectsService: VideoObjectsService) { 

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
          let ch = ["rend1","rend2"]; //track.channels
          for(var vs in ch){
            var mvs=objs.videoSources.find(v => v.name===ch[vs]);
            if(mvs && mvs.getSnapshotImage){
              track.liveSnapshotSources.push(mvs);
            }
          }
          tracks.push(track);
        }
      }
      return tracks;
    });
  }
  public getTrack(trackName: string): Observable<TrackInfo>{
    return this.getTracks().map(ts => ts.find(t => t.name==trackName));
  }
}
