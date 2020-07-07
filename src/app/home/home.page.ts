import { Component, ViewChild, ElementRef } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import * as firebase from "firebase";
import { Observable } from 'rxjs';
import { AngularFireDatabase, AngularFireList } from 'angularfire2/database';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';
import { constants } from 'buffer';
// import  * as iosRtc from 'cordova-plugin-iosrtc';
declare let RTCPeerConnection: any;
declare var MediaRecorder: any;
declare var cordova: any;
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
    private diagnostic: Diagnostic
  ) { }

  ionViewDidEnter() {
    console.log("Ion view did enter called")
    this.plt.ready().then(data=>{
      if(this.plt.is('ios')){
        cordova.plugins.iosrtc.registerGlobals();
        // load adapter.js
        var adapterVersion = 'latest';
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://webrtc.github.io/adapter/adapter-" + adapterVersion + ".js";
        script.async = false;
      }
      this.checkPlatform();
    })
  }
  checkPlatform() {
    console.log("checking platform =>", this.plt.platforms())
    if (this.plt.is('android'))
      this.getAndroidPermission();
      // this.getIosPermission();
    else if (this.plt.is('ios') || this.plt.is('ipad'))
      this.getIosPermission();
    else
      this.setupWebRtc();
  }

  getAndroidPermission() {
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.CAMERA).then(result => {
      console.log('Has permission?', result.hasPermission)
      if (result.hasPermission) {
        this.getAudioPermission();
      } else {
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.CAMERA).then(data => {
          console.log(data)
          if (data.hasPermission) {
            this.getAudioPermission();
          }

        })
      }

    },
      err => {
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.CAMERA).then(data => {
          if (data.hasPermission) {
            this.getAudioPermission();
          }
        })
      })
  }

  getAudioPermission() {
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.RECORD_AUDIO).then(result => {
      console.log('Has permission?', result.hasPermission)
      if (result.hasPermission) {
        this.setupWebRtc();
      } else {
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.RECORD_AUDIO).then(data => {
          console.log(data)
          if (data.hasPermission) {
            this.setupWebRtc();
          }

        })
      }

    },
      err => {
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.RECORD_AUDIO).then(data => {
          if (data.hasPermission) {
            this.setupWebRtc();
          }
        })
      })
  }

  getIosPermission() {
    console.log("Getting permission from the ios devices =>")
    this.diagnostic.isCameraAuthorized().then(data => {
      console.log("permission for the camera =>", data);
      if (data) {
        this.getIosAudioPermission();
      } else {
        this.diagnostic.requestCameraAuthorization().then(data => {
          console.log("gettting camera authorization =>", data);
          this.getIosAudioPermission();
        })
      }
    })
  }

  getIosAudioPermission() {
    this.diagnostic.isMicrophoneAuthorized().then(data => {
      console.log("permission for the microphone =>", data);
      if (data) {
        this.setupWebRtc()
      } else {
        this.diagnostic.requestMicrophoneAuthorization().then(data => {
          console.log("getting authorization microphone =>", data);
          if (data) {
            this.setupWebRtc()
          }
        })
      }
    })
  }

  setupWebRtc() {
    console.log("setting up webrtc");
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
      if(this.plt.is('ios') || this.plt.is('ipad'))
        this.showIos();
      else
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


  showIos(){
      this.me.nativeElement.setAttribute('autoplay', 'autoplay');
      this.me.nativeElement.setAttribute('playsinline', 'playsinline');
       navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
        // Note: Use navigator.mediaDevices.enumerateDevices() Promise to get deviceIds
        /*
        video: {
          // Test Back Camera
          //deviceId: 'com.apple.avfoundation.avcapturedevice.built-in_video:0'
          //sourceId: 'com.apple.avfoundation.avcapturedevice.built-in_video:0'
          deviceId: {
            exact: 'com.apple.avfoundation.avcapturedevice.built-in_video:0'
          }
          // Test FrameRate
          frameRate:{ min: 15.0, max: 30.0 } // Note: Back camera may only support max 30 fps
        }, 
        audio: {
          deviceId: {
            exact: 'Built-In Microphone'
          }
        }*/
      }).then((stream) => {
    
        console.log('getUserMedia.stream', stream);
        console.log('getUserMedia.stream.getTracks', stream.getTracks());
    
        // Note: Expose for debug
        let localStream = stream;
    
        // Attach local stream to video element
        this.me.nativeElement.srcObject = localStream;
        this.pc.addStream(stream);
        this.localStream = stream;
     
      }).catch(function (err) {
        console.log('getUserMedia.error', err, err.stack);
      });
    // }
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

  hasGetUserMedia() {
    const nav: any = navigator;
    console.log(nav.webkitGetUserMedia);
    return !!(nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia);
  }
}
