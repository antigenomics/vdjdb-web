/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

import { Injectable } from '@angular/core';
import { LoggerService } from '../../utils/logger/logger.service';
import { User } from './user';
import { Utils } from '../../utils/utils';

@Injectable()
export class UserService {
    private _isLogged: boolean = false;
    private _user: User = undefined;

    constructor(private logger: LoggerService) {
        this._isLogged = Utils.Cookies.getCookie('logged') === 'true';
        if (this._isLogged) {
            const email = Utils.Cookies.getCookie('email');
            const login = Utils.Cookies.getCookie('login');
            this._user = new User(email, login);
        }
        logger.debug('User', this._user);
    }

    public isLogged(): boolean {
        return this._isLogged && this._user !== undefined;
    }

    public getUser(): User {
        return this._user;
    }
}

