import { Observable } from 'rxjs';
import { Http, Response } from '@angular/http';

export const V1SVC_PATH = location.origin + "/v1/svc/";

export class VideoSource {
    constructor(public name:string, public isLive: boolean, public metaData: any){
        this.videoTracks=new Array<VideoTrack>();
        this.webrtcServers=new Array<WebRTCServer>();

        if(null!=metaData){
            this.displayName = metaData.name;
            this.description = metaData.desc;
        }
        else{
            this.displayName = name;
            this.description = null;
        }

        this.getSnapshotImage=null;
    }
    videoTracks: Array<VideoTrack>;
    webrtcServers: Array<WebRTCServer>;

    getStreamDetails: Observable<LiveStreamDetails>;
    getSnapshotImage: string;

    public readonly displayName : string;
    public readonly description : string;
}

export class LiveStreamDetails {
    lastFrame: Date;
    resolution: [number,number];
    bitrate: number;
    framerate: number;
}

export class VideoTrack {
    constructor(public videoSource: VideoSource, public videoArchive: VideoArchive){}
    getTrackData: () => Observable<VideoTrackData>;
}

export class VideoTrackSummary {
    constructor(public timeBoundaries: [Date, Date], public diskUsage: number){}
}

export class VideoTrackData {
    summary: VideoTrackSummary;
    timeLine: Array<[Date,Date]>;
}

export class VideoArchive {
    constructor(public name: string, public metaData: any){
        this.videoTracks=new Array<VideoTrack>();

        if(null!=metaData){
            this.displayName = metaData.name;
            this.description = metaData.desc;
        }
        else{
            this.displayName = name;
            this.description = null;
        }
    }
    videoTracks: Array<VideoTrack>;

    getSummary: () => Observable<VideoArchiveSummary>;
    summarySnapshot: VideoArchiveSummary;

    public readonly displayName : string;
    public readonly description : string;
}

export class VideoArchiveSummary {
    diskUsage: number;
    diskFreeSpace: number;
    tracks: Map<string, VideoTrackSummary>;
}

export class WebRTCServer {
    constructor(private http: Http, public name: string, public metaData: any){
        this.videoSources=new Array<VideoSource>();

        if(null!=metaData){
            this.displayName = metaData.name;
            this.description = metaData.desc;

            this.iceServers=[];
            if(location.hostname.toLowerCase() != "localhost" && location.hostname != "127.0.0.1" && null != metaData.stunsrv){
                this.iceServers.push({urls:"stun:"+location.hostname+":"+metaData.stunsrv});
            }
            if(null != metaData.stun){
                for(let ss of metaData.stun){
                    let [host,port] = ss;
                    this.iceServers.push({urls:"stun:"+host+":"+port});
                }
            }
        }
        else{
            this.displayName = name;
            this.description = null;
        }
    }
    videoSources: Array<VideoSource>;
    public readonly displayName : string;
    public readonly description : string;

    public readonly iceServers : Array<any>;

    public requestOffer(sessionId: string, videoSource: VideoSource | string) : Observable<string>{
        if(typeof videoSource === 'string'){
            return this.http.put(V1SVC_PATH+this.name+"/"+sessionId, {live: videoSource}).map(res => res.text().replace(/\r\n/g,'\n')+"\n");
        }
        else{
            return this.requestOffer(sessionId, videoSource.name);
        }
    }
    public updateSession(sessionId: string, videoSource: VideoSource | string) : Observable<any>{
        if(typeof videoSource === 'string'){
            return this.http.post(V1SVC_PATH+this.name+"/"+sessionId, {live: videoSource}).map(res => res.json());
        }
        else{
            return this.updateSession(sessionId, videoSource.name);
        }
        
    }
    public sendAnswer(sessionId: string, sdp: string) : Observable<Response>{
        return this.http.post(V1SVC_PATH+this.name+"/"+sessionId+"/answer", sdp);
    }
    public dropSession(sessionId: string) : Observable<Response>{
        return this.http.delete(V1SVC_PATH+this.name+"/"+sessionId);
    }
}

export class WebRTCServerSummary {
    sessions: number;
    live: Array<string>;
}

export class VideoObjects {
    videoSources: Array<VideoSource>;
    videoArchives: Array<VideoArchive>;
    webrtcServers: Array<WebRTCServer>;
    meta : Map<string, any>;
}

