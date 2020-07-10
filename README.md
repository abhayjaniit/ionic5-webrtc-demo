# ionic5-webrtc-demo

Video confence app for the ionic 5(angular/cordova) using webrtc. this app is worked with the ios, android and web. 

clone this repo
```bash
git clone https://github.com/abhayjaniit/ionic5-webrtc-demo.git
```
this app is used firebase as the backend you need to set your firebase config in the app.module.ts file.

Install node modules
```bash
npm install
```

Add android platform 
```bash
ionic cordova platform add android
```
Before runnig with the android need to set the permission strings in AndroidManifest.xml here is the strings
```bash
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```
Run android 
```bash 
ionic cordova run android
```

Add ios platform 
```bash
ionic cordova platform add ios
```

Run ios 
```bash 
ionic cordova build ios
```
Open xcode and run you ios app with your device not in emulator. Because ios emulator dose not support camera and your app maybe crash with the emulator.
app is tested with the android 10, ios 13.

To test app on the browser just serve app using 
```bash
ionic serve
```
