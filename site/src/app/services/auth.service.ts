import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tokenNotExpired } from 'angular2-jwt';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

@Injectable()
export class AuthService {
  private authToken: string;
  private user: object;
  private userProfile: object;

  private signUpRoute: string = 'http://localhost:80/users/register';
  private loginRoute: string = 'http://localhost:80/users/login';
  private getProfileRoute: string = 'http://localhost:80/users/profile';
  private updateProfilePicRoute: string = 'http://localhost:80/users/update-profile-pic';
  private updateProfileBioRoute: string = 'http://localhost:80/users/update-profile-bio';

  constructor(private http: HttpClient) { }

  public registerUser(newUser) {
    const headers = new HttpHeaders();
    headers.append('Content-type', 'application/json');

    // Add the map part
    const post = this.http.post(this.signUpRoute, newUser, {headers: headers});

    return post;
  }

  /**
   * This will attempt to login the user
   * @param existingUser A valid login attempt
   */
  public authenticateUser(existingUser) {
    const headers = new HttpHeaders();
    headers.append('Content-type', 'application/json');

    const post = this.http.post(this.loginRoute, existingUser, {headers: headers});

    return post;
  }

  /**
   * Runs when the user logs in correctly
   * @param token The token given by the API
   * @param user The user that just logged in; similar to a session... I think
   */
  public storeUserData(token, user) {
    localStorage.setItem('id_token', token);

    this.authToken = token;
    this.user = user;
  }

  /**
   * Grabs the token from the local storage
   */
  public loadToken() {
    const token: string = localStorage.getItem('id_token');
    this.authToken = token;
  }

  private getToken() {
    this.loadToken();
    return this.authToken;
  }

  /**
   * Checks the local storage for an token and checks if it is a valid token
   * @returns {boolean} false if the token is valid, true if the token is not
   */
  public loggedIn() {
    return tokenNotExpired('id_token');
  }

  /**
   * Clears the local storage so that the JWT is no longer available until
   * they log in again
   */
  public logOut() {
    this.authToken = null;
    this.user = null;
    localStorage.clear();
  }

  public getProfile() {

    return this.http.get(this.getProfileRoute, {
      headers: new HttpHeaders().append('Authorization', this.getToken())
    });

  }

  public updateProfilePic(image): Observable<object> {
    const fd: FormData = new FormData();
    fd.append('image', image);

    return this.http.post(this.updateProfilePicRoute, fd,
      {headers: new HttpHeaders().append('Authorization', this.getToken())});
  }
}
