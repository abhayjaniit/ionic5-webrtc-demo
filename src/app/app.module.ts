import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { AngularFireModule } from 'angularfire2';
import { AngularFireDatabaseModule } from 'angularfire2/database';
const config = {
  apiKey: "AIzaSyD7QV36mIsgWvTT5IWmF8bh6ggj-KyOfxI",
  authDomain: "mychatapp-ed842.firebaseapp.com",
  databaseURL: "https://mychatapp-ed842.firebaseio.com",
  projectId: "mychatapp-ed842",
  storageBucket: "mychatapp-ed842.appspot.com",
  messagingSenderId: "789512888811",
  appId: "1:789512888811:web:18b07b92178a546d5eb9ae"
}
@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(), 
    AppRoutingModule,
    AngularFireModule.initializeApp(config),
    AngularFireDatabaseModule
  ],
  providers: [
    StatusBar,
    SplashScreen,
    AndroidPermissions,
    Diagnostic,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
