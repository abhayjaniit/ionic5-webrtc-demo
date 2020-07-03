import { Component, ViewChild, ElementRef } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import * as firebase from "firebase";
import { Observable } from 'rxjs';
import { AngularFireDatabase, AngularFireList } from 'angularfire2/database';
declare let RTCPeerConnection: any;
declare var MediaRecorder: any;
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  @ViewChild('video') video: ElementRef;
  mediaRecorder;
  chunks = [];
  // channel: any = [];
  pc1: any;
  pc2: any;
  offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
  };

  callActive: boolean = false;
  pc: any;
  localStream: any;
  channel: AngularFireList<{}>;
  database: firebase.database.Reference;
  senderId: string;
  @ViewChild("me") me: any;
  @ViewChild("remote") remote: any;
  constructor(
    private plt: Platform,
    private androidPermissions: AndroidPermissions,
    private afDb: AngularFireDatabase,
  ) {}

  ionViewDidEnter(){
    // this.getUserMedia()
    this.checkPlatform();
    
  }
  checkPlatform(){
    if(this.plt.is('android'))
      this.getVideoPermission();
    else
      this.setupWebRtc();
  }

  getVideoPermission(){
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.CAMERA).then(result => {
      console.log('Has permission?',result.hasPermission)
      if(result.hasPermission){
        this.getAudioPermission();
      }else{
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.CAMERA).then(data=>{
          console.log(data)
          if(data.hasPermission){
            this.getAudioPermission();
          }
          
        })
      }
      
    },
    err => {
      this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.CAMERA).then(data=>{
        if(data.hasPermission){
          this.getAudioPermission();
        }
      })
    })
  }

  getAudioPermission(){
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.RECORD_AUDIO).then(result => {
      console.log('Has permission?',result.hasPermission)
      if(result.hasPermission){
        this.setupWebRtc();
      }else{
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.RECORD_AUDIO).then(data=>{
          console.log(data)
          if(data.hasPermission){
            this.setupWebRtc();
          }
          
        })
      }
      
    },
    err => {
      this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.RECORD_AUDIO).then(data=>{
        if(data.hasPermission){
          this.setupWebRtc();
        }
      })
    })
  }

  setupWebRtc() {
    this.senderId = this.guid();
    var channelName = "/webrtc";
    this.channel = this.afDb.list(channelName);
    this.database = this.afDb.database.ref(channelName);
    this.database.on("child_added", this.readMessage.bind(this));

    try {
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.services.mozilla.com" },
          { urls: "stun:stun.l.google.com:19302" }
        ]
      }, { optional: [] });
    } catch (error) {
      console.log(error);
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.services.mozilla.com" },
          { urls: "stun:stun.l.google.com:19302" }
        ]
      }, { optional: [] });
    }


    this.pc.onicecandidate = event => {
      event.candidate ? this.sendMessage(this.senderId, JSON.stringify({ ice: event.candidate })) : console.log("Sent All Ice");
    }

    this.pc.onremovestream = event => {
      console.log('Stream Ended');
    }

    this.pc.ontrack = event =>
      (this.remote.nativeElement.srcObject = event.streams[0]); // use ontrack
    this.showMe();
  }

  sendMessage(senderId, data) {
    var msg = this.channel.push({ sender: senderId, message: data });
    msg.remove();
  }

  readMessage(data) {
    console.log(data.val());
    if (!data) return;
    try {
      var msg = JSON.parse(data.val().message);
      let personalData = data.val().personalData;
      var sender = data.val().sender;
      if (sender != this.senderId) {
        if (msg.ice != undefined && this.pc != null) {
          this.pc.addIceCandidate(new RTCIceCandidate(msg.ice));
        } else if (msg.sdp.type == "offer") {
          this.callActive = true;
          this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            .then(() => this.pc.createAnswer())
            .then(answer => this.pc.setLocalDescription(answer))
            .then(() => this.sendMessage(this.senderId, JSON.stringify({ sdp: this.pc.localDescription })));
        } else if (msg.sdp.type == "answer") {
          this.callActive = true;
          this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  showMe() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => (this.me.nativeElement.srcObject = stream))
      .then(stream => {
        this.pc.addStream(stream);
        this.localStream = stream;
      });
  }

  showRemote() {
    try {
      this.pc.createOffer()
        .then(offer => this.pc.setLocalDescription(offer))
        .then(() => {
          this.sendMessage(this.senderId, JSON.stringify({ sdp: this.pc.localDescription }));
          this.callActive = true;
        });
    } catch (error) {
      this.setupWebRtc();
      console.log(error);
    }
  }

  hangup() {
    this.pc.close();
    let tracks = this.localStream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].stop();
    }
    this.callActive = false;
  }

  guid() {
    return (this.s4() + this.s4() + "-" + this.s4() + "-" + this.s4() + "-" + this.s4() + "-" + this.s4() + this.s4() + this.s4());
  }
  s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  public ngOnDestroy() {
    this.pc.close();
    let tracks = this.localStream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].stop();
    }
    this.callActive = false;
  }
}
