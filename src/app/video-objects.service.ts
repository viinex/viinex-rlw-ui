import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';

import { Observable } from "rxjs";
import { webSocket,WebSocketSubjectConfig, WebSocketSubject } from 'rxjs/webSocket';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/observable/zip';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/of';

import { 
    VideoObjects, 
    VideoArchive, 
    VideoSource, 
    VideoArchiveSummary, 
    VideoTrack, 
    VideoTrackData, 
    VideoTrackSummary,
    LiveStreamDetails,
    EventArchive,
    WebRTCServer,
    WebRTCServerSummary,
    V1SVC_PATH
} from './video-objects'

@Injectable({providedIn:'root'})
export class VideoObjectsService {
    public webSocket : WebSocketSubject<any>;
    constructor(private http: Http){
      let cfg : WebSocketSubjectConfig<any>={
        url:"ws://"+location.host,
        openObserver:{
          next: ()=>{
            console.log("websocket connected");
            this.webSocket.next(["subscribe",{}]);
            //this.webSocket.next(JSON.stringify(["subscribe",{"topics":["RailcarNumberRecognition"]}]));
          }
        }
      };
      this.webSocket=webSocket(cfg);
      //this.webSocket.subscribe(console.log);
    }
    getObjects(): Observable<VideoObjects>{
        return Observable.zip(
            this.http.get(V1SVC_PATH.slice(0,-1)), // chop off last /
            this.http.get(V1SVC_PATH+"meta"),
            (res:Response, resMeta:Response) => VideoObjectsService.extractSvcData(this.http, res, resMeta))
        .mergeMap((vo:VideoObjects) => VideoObjectsService.linkWebRTCServers(this.http, vo))
        .mergeMap((vo:VideoObjects) => VideoObjectsService.createAllTracks(this.http, vo));
    }
    getVideoSource(videoSourceId: string) : Observable<VideoSource> {
        return this.getObjects().map(vo => vo.videoSources.find(vs => vs.name==videoSourceId));
    }
    getVideoArchive(videoArchiveId: string) : Observable <VideoArchive>
    {
        return this.getObjects().map(vo => vo.videoArchives.find(va => va.name==videoArchiveId));
    }
    getVideoTrack(videoArchiveId: string, videoSourceId: string){
        return this.getVideoArchive(videoArchiveId).map(va => va.videoTracks.find(vt => vt.videoSource.name==videoSourceId));
    }
    private static extractSvcData(http: Http, res: Response, resMeta: Response){
        let body=res.json();
        let bodyMeta=resMeta.json();
        let vo=new VideoObjects();
        let vs=new Array<VideoSource>();
        let va=new Array<VideoArchive>();
        let wr=new Array<WebRTCServer>();
        let ea=new Array<EventArchive>();
        for(let tn of body){
            let [t,n]=tn;
            switch(t){
                case "VideoSource": {
                    let s=new VideoSource(n, true, bodyMeta[n]);
                    s.getStreamDetails=http.get(V1SVC_PATH+n).map(VideoObjectsService.extractLiveStreamDetails);
                    for(let tn1 of body){
                        let [t1,n1]=tn1;
                        if(t1=="SnapshotSource" && n1==n){
                            s.getSnapshotImage=V1SVC_PATH+n+"/snapshot";
                        }
                    }
                    vs.push(s);
                    break;
                }
                case "VideoStorage": {
                    let x=new VideoArchive(n, bodyMeta[n]); 
                    x.getSummary=function(){
                        return http.get(V1SVC_PATH+n).map(r => {
                            let s=VideoObjectsService.extractArchiveSummary(r);
                            x.summarySnapshot=s;
                            return s;
                        })
                    };
                    va.push(x);
                    break;
                }
                case "WebRTC": {
                    let w = new WebRTCServer(http, n, bodyMeta[n]);
                    wr.push(w);
                    break;
                }
                case "EventArchive": {
                    let a = new EventArchive(http, n, bodyMeta[n]);
                    ea.push(a);
                    break;
                }
            }
        }
        vo.videoSources=vs;
        vo.videoArchives=va;
        vo.webrtcServers=wr;
        vo.eventArchives=ea;
        vo.meta=bodyMeta;
        return vo;
    }
    private static extractLiveStreamDetails(res: Response){
        let body=<any>res.json();
        let d=new LiveStreamDetails();
        d.bitrate=body.bitrate;
        d.framerate=body.framerate;
        d.resolution=body.resolution;
        d.lastFrame=new Date(body.last_frame);
        return d;
    }
    private static createAllTracks(http: Http, vo: VideoObjects): Observable<VideoObjects> {
        if(vo.videoArchives==null || vo.videoArchives.length==0){
            return Observable.of(vo);
        }
        return Observable.forkJoin(vo.videoArchives.map(a => { return a.getSummary() })).map(
            res => {
                for(let k=0; k<vo.videoArchives.length; ++k){
                    VideoObjectsService.createTracks(http, vo.videoSources, vo.videoArchives[k], res[k]);
                }
                return vo;
            }
        );
    }

    private static extractArchiveSummary(res: Response): VideoArchiveSummary{
        let body=<any>res.json();
        let vas=new VideoArchiveSummary();
        vas.diskFreeSpace=body.disk_free_space;
        vas.diskUsage=body.disk_usage;
        vas.tracks=new Map<string,VideoTrackSummary>();
        for(let tn in body.contexts){
            let c=<any>body.contexts[tn];
            let ts=new VideoTrackSummary(VideoObjectsService.jsonDateInterval(c.time_boundaries), c.disk_usage);
            vas.tracks.set(tn, ts);
        }
        return vas;
    }
    private static createTracks(http: Http, vs:Array<VideoSource>, a: VideoArchive, vas:VideoArchiveSummary){
        vas.tracks.forEach((t: VideoTrackSummary, n:string) => {
            let vsrc=this.lookupOrAddArchiveVideoSource(vs, n);
            let vt=new VideoTrack(vsrc, a);
            vt.getTrackData=function(){ return http.get(V1SVC_PATH+a.name+"/"+n).map(VideoObjectsService.extractTrackData) };
            a.videoTracks.push(vt);
            vsrc.videoTracks.push(vt);
        });
    }

    private static extractTrackData(res:Response): VideoTrackData {
        let body=<any>res.json();
        let td=new VideoTrackData();
        td.summary=new VideoTrackSummary(VideoObjectsService.jsonDateInterval(body.time_boundaries), body.disk_usage);
        td.timeLine=body.timeline!=null?body.timeline.map(VideoObjectsService.jsonDateInterval):null;
        return td;
    }

    static jsonDateInterval(ii: any): [Date,Date]{
        if(ii!=null){
            return [new Date(ii[0]), new Date(ii[1])];
        } 
        else {
            return null;
        }
    }

    private static lookupOrAddArchiveVideoSource(vs: Array<VideoSource>, n:string): VideoSource
    {
        let res=vs.find(x => {
            return x.name==n;
        });
        if(!res){
            res=new VideoSource(n, false, null);
            vs.push(res);
        }
        return res;
    }

    private static linkWebRTCServers(http: Http, vo: VideoObjects): Observable<VideoObjects> {
        if(vo.webrtcServers==null || vo.webrtcServers.length==0){
            return Observable.of(vo);
        }
        return Observable.forkJoin(vo.webrtcServers.map(w => { 
            return http.get(V1SVC_PATH+w.name).map((res : Response) => { return <WebRTCServerSummary>res.json(); });
        })).map(
            res => {
                for(let k=0; k<vo.webrtcServers.length; ++k){
                    let w = vo.webrtcServers[k];
                    let r = res[k];
                    r.live.forEach(src => {
                        let vs = vo.videoSources.find(e => e.name==src);
                        if(vs){
                            vs.webrtcServers.push(w);
                            w.videoSources.push(vs);
                        }
                    });
                }
                return vo;
            }
        );
    }

}