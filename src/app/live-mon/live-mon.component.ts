import { Component, OnInit, OnDestroy } from '@angular/core';

import { ActivatedRoute,Router }       from '@angular/router';

import { Observable } from "rxjs/Observable";
import 'rxjs/add/operator/switchMap'


import {VideoObjectsService} from '../video-objects.service'
import {VideoSource,VideoArchive,VideoObjects,VideoTrack,WebRTCServer} from '../video-objects'
import {TracksService,TrackInfo, RecResult, ChanInfo,Timestamps} from '../tracks.service'
import { Subscription } from 'rxjs';

const MAX_LAST_RESULTS=5;

class WebrtcViewport{
  public viewport: HTMLVideoElement;
  public peerConnection: RTCPeerConnection;
  public sessionId: string;
  public errorMessage: string;
  public viewportVisible: boolean;
}

@Component({
  selector: 'app-live-mon',
  templateUrl: './live-mon.component.html',
  styleUrls: ['./live-mon.component.css']
})
export class LiveMonComponent implements OnInit, OnDestroy {

  public track: TrackInfo;

  private nextCookie: number;

  public last_result: RecResult;
  public last_results: Array<RecResult>;

  private resultsSubscription: Subscription;

  public viewports: Array<WebrtcViewport>;
  private webrtcServer: WebRTCServer;

  constructor(private route: ActivatedRoute, private router: Router, 
    private videoObjectsService: VideoObjectsService, private tracksService: TracksService) { 
      this.last_results=new Array<RecResult>(MAX_LAST_RESULTS);
      this.nextCookie=1;
  }

  ngOnInit() {
    this.videoObjectsService.getObjects().subscribe(vo => {
      if(vo.webrtcServers.length){
        this.webrtcServer=vo.webrtcServers[0];
        this.initViewports();
      }
      else{
        console.error("No webrtc servers configured in Viinex instance");
      }
      this.route.params.switchMap(params => 
        this.tracksService.getTrack(params["track"]))
        .subscribe(track => { 
          this.track=track;
          this.last_results=new Array<RecResult>(MAX_LAST_RESULTS);
          this.last_result=null;
          if(this.resultsSubscription){
            this.resultsSubscription.unsubscribe();
          }
          this.resultsSubscription=this.tracksService.trackResults(track.name).subscribe(
            rr => {
              this.last_result=rr;
              this.last_results.push(rr);
              this.last_results=this.last_results.slice(-MAX_LAST_RESULTS);
            }
          );
          this.connectVideo();
        });
      });
  }

  ngOnDestroy(){
    for(let vp of this.viewports){
      if(vp && vp.peerConnection){
        vp.peerConnection.close();
        vp.peerConnection=null;
        this.webrtcServer.dropSession(vp.sessionId).subscribe(r => {
          console.debug("Session "+vp.sessionId+" dropped");
        });
      }
    }
  }

  initViewports(){
    this.viewports=[];
    let vps=document.getElementsByClassName("viewport");
    for(var k=0; k<vps.length; ++k){
      let vpe=vps.item(k) as HTMLVideoElement;
      if(!vpe){
        continue;
      }
      let vp=new WebrtcViewport();
      vp.viewport=vpe;
      vp.sessionId=LiveMonComponent.uuidv4();
      this.viewports.push(vp);
    }
    console.log("vieports: ",this.viewports.length);
  }

  sendRecognize(rec: boolean){
    this.tracksService.sendRecognize(this.track.name, rec, this.nextCookie);
    if(!rec){
      this.nextCookie=this.nextCookie+1;
    }
  }

  createPeerConnection(viewport: WebrtcViewport) : RTCPeerConnection {
    let pc=new RTCPeerConnection({iceServers:this.webrtcServer.iceServers});
    console.log(this.webrtcServer.iceServers);
    pc.onicecandidate = e => {
        if(e.candidate==null){
            console.debug("last candidate received");
            console.debug(pc.localDescription.sdp);
            this.webrtcServer.sendAnswer(viewport.sessionId, pc.localDescription.sdp).subscribe((res:any) => {
                if(res.ok){
                    viewport.errorMessage=null;
                    console.debug("ice gathering state:", pc.iceGatheringState);
                }
                else{
                    viewport.errorMessage=res.toString();
                    console.debug("ice gathering state:", pc.iceGatheringState);
                }
            });
        }
        else{
            console.debug("next onicecandidate: ", e);
        }
    };
    let pcany = <any>pc;
    pcany.ontrack = (e : any) => {
        //let e = <RTCTrackEvent>ev;
        console.log("ontrack event received: ");
        console.log(e.streams[0]);
        viewport.viewport.srcObject=e.streams[0];
        console.log(e.track);
        console.log("ice gathering state:", pc.iceGatheringState);
    }
    pc.onsignalingstatechange = e => {
        console.log("signalingState:", pc.signalingState);
    }
    pc.oniceconnectionstatechange = (e) => {
        console.log("RTCPeerConnection.iceConnectionState: ", pc.iceConnectionState);
        //viewport.connectionState=pc.iceConnectionState;
        //this.changeDetector.detectChanges();
    }
    return pc;
  }

  connectVideo(){
    if(!this.track){
      console.debug("connectVideo: track not set");
      return;
    }
    for(var k=0; k<this.track.channels.length; ++k){
      if(k<this.viewports.length){
        let vp=this.viewports[k];
        if(!vp.peerConnection){
          vp.viewportVisible=true;
          vp.peerConnection=this.createPeerConnection(vp);
          this.webrtcServer.requestOffer(vp.sessionId, this.track.channels[k])
            .subscribe(sdp => {
                console.debug("Got remote offer: ", sdp);
                LiveMonComponent.setRemoteOffer(vp.peerConnection, sdp);
            });
        }
        else{
          this.webrtcServer.updateSession(vp.sessionId, this.track.channels[k])
            .subscribe(r => console.debug("updateSession: ", r));
        }
      }
    }
    // and drop extra sessions
    for(var k=this.track.channels.length; k<this.viewports.length; ++k){
      let vp=this.viewports[k];
      if(vp.peerConnection){
        vp.peerConnection.close();
        vp.peerConnection=null;
        this.webrtcServer.dropSession(vp.sessionId);
        vp.viewport.hidden=true;
        vp.viewportVisible=false;
      }
    }
  }

  static setRemoteOffer(pc: RTCPeerConnection, sdp: string){
      let rsd = new RTCSessionDescription({ type: "offer", sdp: sdp });
      pc.setRemoteDescription(rsd).then(() => {
          console.log("Remote offer description set successfully");
          pc.createAnswer().then((d) => {
              console.log("Got answer description: ", d);
              console.log(d.sdp);

              pc.setLocalDescription(d).then(() => {
                  console.log("local answer set successfully");
                  console.log(pc);
              }).catch((e) => {
                  console.log("setting local answer failed: ", e);
              });
          });
      }).catch((e) => {
          console.log("Failed to set remote offer description: ", e);
      });
  }

  static uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
