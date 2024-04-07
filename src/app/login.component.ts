import {Component, OnInit} from '@angular/core';
import { Router } from '@angular/router';

import {LoginService, LoginStatus, Transport } from './login.service'
import { Observable, timer } from 'rxjs';

@Component({
    selector: 'login',
    templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
    isServerOnline: boolean;
    isLoginRequired: boolean;
    isWamp : boolean = false;

    wampUri: string = "";
    wampRealm: string = "";
    loginName: string = "";
    loginPassword: string = "";

    errorMessage: string;

    constructor(private loginService: LoginService, private router: Router){}
    ngOnInit(): void {
        this.isWamp = false;
        this.loginService.loginStatus.subscribe(
            ls => { 
                console.debug("LoginComponent.ngOnInit");
                if(null!=ls){
                    this.isServerOnline=true; 
                    this.isLoginRequired = ls.isLoginRequired(); 
                    this.loginName = ls.loginName; 
                    this.isWamp = ls.transport==Transport.Wamp;

                    if(this.isWamp){
                        this.wampUri = "wss://cloud.viinex.com/ws";
                        this.wampRealm = "lwo";
                        this.loginName = "guest";
                    }
                }
                else{
                    this.isServerOnline=false;
                }
            }
        );
        this.loginService.getErrorMessage().subscribe(v => { this.errorMessage=v; })
    }

    public onLogin(){
        let password=this.loginPassword;
        this.loginService.login({login: this.loginName, password: password, isWamp: this.isWamp, uri: this.wampUri, realm: this.wampRealm}).subscribe((loggedOn: boolean) => {
            if(loggedOn){
                timer(1000).subscribe(() => { 
                    this.router.navigate(['/']); 
                });
            }
        });
    }
    public onLogout(){
        this.loginService.logout().subscribe(() => {
            
        });
    }

}