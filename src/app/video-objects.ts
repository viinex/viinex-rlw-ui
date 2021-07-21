import { Observable } from 'rxjs';
import { Http, Response } from '@angular/http';
import { stringify } from '@angular/compiler/src/util';

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
    public readonly getSnapshotImage : (d: Date) => string;
    constructor(public videoSource: VideoSource, public videoArchive: VideoArchive){
        this.getSnapshotImage=(d: Date) => { return V1SVC_PATH+videoArchive.name+"/"+videoSource.name+"/"+"snapshot?timestamp="+d.toISOString(); }
    }
    getTrackData: () => Observable<VideoTrackData>;
    getMp4(begin: Date, end: Date){
        return V1SVC_PATH+this.videoArchive.name+"/"+this.videoSource.name+"/"+"export?format=isom"
        +"&begin="+begin.toISOString()+"&end="+end.toISOString();
    }
    getHls(begin: Date, end: Date){
        return V1SVC_PATH+this.videoArchive.name+"/"+this.videoSource.name+"/"+"stream.m3u8"
        +"?begin="+begin.toISOString()+"&end="+end.toISOString();
    }
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

export class EventArchiveSummaryEntry {
    constructor(public origin: string, public topic: string, public count: number){}
}

export class EventArchiveSummary extends Array<EventArchiveSummaryEntry> {}

export class EventOrigin {
    name: string;
    type: string;
    details: object;
}

export class EventDesc {
    topic: string;
    origin: EventOrigin;
    timestamp: Date;
    data: object;
}

export class EventArchive {
    constructor(private http: Http, public name: string, public metaData: any){
    }
    public getSummary(begin?: Date, end?: Date) : Observable<EventArchiveSummary>{
        return this.http.get(V1SVC_PATH+this.name+"/summary"+EventArchive.queryParams(begin,end)).map(
            (res: Response) => {
                let body=<EventArchiveSummary>res.json();
                return body;
            }
        );
    }
    public getEvents(begin?: Date, end?: Date, topics?: Array<string>, origins?: Array<string>, limit?: number, offset? : number) : Observable<Array<EventDesc>>{
        return this.http.get(V1SVC_PATH+this.name+EventArchive.queryParams(begin,end, topics, origins, limit, offset))
            .map((res: Response) => <Array<EventDesc>>res.json());
    }
    private static queryParams(begin?: Date, end?: Date, topics?: Array<string>, origins?: Array<string>, limit?: number, offset? : number) : string {
        let p = [];
        if(begin!=null){
            p.push("begin="+begin.toISOString());
        }
        if(end!=null){
            p.push("end="+end.toISOString());
        }
        if(topics!=null){
            p.push("topic="+topics.join(","));
        }
        if(origins!=null){
            p.push("origin="+origins.join(","));
        }
        if(isFinite(limit) && (limit > 0)){
            p.push("limit="+limit.toString());
            if(Number.isFinite(offset)){
                p.push("offset="+offset.toString());
            }
            else{
                p.push("offset=0");
            }
        }
        if(p.length > 0){
            return "?"+p.join("&");
        }
        else{
            return "";
        }
    }
}

export class VideoObjects {
    videoSources: Array<VideoSource>;
    videoArchives: Array<VideoArchive>;
    webrtcServers: Array<WebRTCServer>;
    eventArchives: Array<EventArchive>;
    meta : Map<string, any>;
}

