import { Injectable, OnInit } from '@angular/core';
import { Observable, ReplaySubject, of } from "rxjs";
import { map, mergeMap, catchError } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http'

import { CookieService } from 'ngx-cookie-service';
import * as Cookies from 'js-cookie';

import * as Crypto from 'crypto-js';
import * as jwtDecode from 'jwt-decode'

export enum Transport { None = 'none', Http = 'http', Wamp = 'wamp' };

export interface LoginParams {
    login: string,
    password: string,
    isWamp: boolean,
    uri: string,
    realm: string
}

export class LoginStatus {
    public readonly transport: Transport = null;
    public readonly anonymous: boolean = true; // if anonymous access *TO VIINEX* is allowed
    public readonly loginName: string = null;
    constructor(t: Transport, a: boolean, l?: string){
        this.transport=t;
        this.anonymous=a;
        if(l){
            this.loginName=l;
        }
    }
    public isServerAccessible(){
        return this.transport != Transport.None;
    }
    public isLoginPageRelevant(){
        return this.transport!=Transport.None && !(this.transport==Transport.Http && this.anonymous);
    }
    public isLoginRequired(){
        return this.loginName == null &&
            (   (this.transport==Transport.Wamp) || 
                (this.transport==Transport.Http && !this.anonymous)
            );
    }
    public isHttp(){
        return this.transport==Transport.Http;
    }
}

@Injectable()
export class LoginService {
    constructor(private http: HttpClient, private cookieService: CookieService){
        this.lastLoginStatus=new LoginStatus(Transport.None, false);
        this._loginStatus=new ReplaySubject(1);
        this._errorMessage=new ReplaySubject(1);
        console.debug("LoginService ctor");
        this.initialCheckLoginStatus().subscribe(()=>{
            console.debug("Login status initialized");
        });
    }

    private lastLoginStatus : LoginStatus;

    private _loginStatus : ReplaySubject<LoginStatus>;
    private _errorMessage : ReplaySubject<string>;

    public get loginStatus() : Observable<LoginStatus>{
        return this._loginStatus.asObservable();
    }
    public getErrorMessage() : Observable<string>{
        return this._errorMessage.asObservable();
    }

    private setLoginStatus(ls : LoginStatus){
        this.lastLoginStatus=ls;
        this._loginStatus.next(ls);
        switch(ls.transport){
            case Transport.Http: 

                //this.setRpc(new HttpRpc(this.http));
                break;
            case Transport.Wamp: 
                //this.setRpc(new WampRpc(this.wamp));
                break;
            case Transport.None: 
                //this.setRpc(null);
                break;
        }
    }
    private setErrorMessage(e : string){
        this._errorMessage.next(e);
    }

    private initialCheckLoginStatus(): Observable<void> {
        if(this.lastLoginStatus.transport==Transport.None){
            console.debug("initial check login status");
            return this.checkLoginStatus();
        }
        else {
            return of();
        }
    }

    private setLoginStatusFromCookie(){
        var c=this;
        var authCookie=this.cookieService.get('auth');
        if(null != authCookie){
            let d =  jwtDecode.jwtDecode<Object>(authCookie);
            console.debug("JWT content:", d);
            this.setLoginStatus(new LoginStatus(Transport.Http, false, (<any>d).sub)); // non-anonymous login was allowed over http
        }
        else{
            this.setLoginStatus(new LoginStatus(Transport.Http, true)); // anonymous login was allowed over http
        }
        this.setErrorMessage(null);
    }

    private checkLoginStatus(): Observable<void> {
        return this.http.get("/v1/svc").pipe(map(
            (res:Response) => { 
                this.setLoginStatusFromCookie();
            }),
            catchError((error: any, caught: Observable<void>) => { 
                this.handleErrorObservable(error); 
                return of<void>(); 
            })
        );
    }

    private handleErrorObservable (error: Response) {
        if(error.status==403) {
            this.setLoginStatus(new LoginStatus(Transport.Http, false)); 
            this.setErrorMessage(null);
        }
        else if(error.status==404){
            this.setLoginStatus(new LoginStatus(Transport.Wamp, true)); 
            this.setErrorMessage(null);
        }
        else {
            this.setLoginStatus(new LoginStatus(Transport.None, false)); 
            this.setErrorMessage(error.toString());
        }
    }

    public login({ login, password, isWamp = false, uri, realm } : LoginParams){
        return this.loginHttp(login, password);
    }
    private loginWamp(uri: string, realm: string, login : string, password : string){
        throw "Not implemented"
    }
    private loginHttp(login : string, password : string){
        return this.http.post("/v1/authGetChallenge?login="+login, '')
            .pipe(mergeMap(
                (res:Object) => {
                    let challenge=<any>res;
                    let secret = challenge.realm ? Crypto.MD5(login + ':' + challenge.realm + ':' + password).toString(Crypto.enc.Hex) : password;
                    let responseStr = Crypto.HmacMD5(challenge.challenge, secret).toString(Crypto.enc.Hex);
                    let response = {
                        login: login,
                        when: challenge.when, 
                        challenge: challenge.challenge,
                        signature: challenge.signature,
                        response: responseStr
                    };
                    return this.http.post("/v1/authCheckResponse", response).pipe(map((res:Object)=>{
                        this.setLoginStatusFromCookie();
                        return true;
                    }));
                })).pipe(catchError((err) => {
                    console.error("Caught error when logging in via HTTP:",err);
                    if(err.status == 403){
                        this.setErrorMessage("Invalid credentials");
                    }
                    else{
                        this.setErrorMessage("Failure while contacting logon server (it could be that server is unreachable; see console log for details)");
                    }
                    return of(false);
                }));
    }
    public logout(){
        Cookies.remove('auth');
        this.setLoginStatus(new LoginStatus(Transport.None, false));
        return this.checkLoginStatus();
    }

}