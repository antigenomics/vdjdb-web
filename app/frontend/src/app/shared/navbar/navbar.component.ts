/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LoggerService } from 'utils/logger/logger.service';
import { Utils } from 'utils/utils';

@Component({
    selector:    'navbar',
    templateUrl: './navbar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationBarComponent {
    private readonly _isLogged: boolean = false;
    private readonly _userEmail: string = '';
    private readonly _userLogin: string = '';

    constructor(logger: LoggerService) {
        this._isLogged = Utils.Cookies.getCookie('logged') === 'true';
        this._userEmail = Utils.Cookies.getCookie('email');
        this._userLogin = Utils.Cookies.getCookie('login');
        if (this._userEmail !== undefined && this._userLogin !== undefined) {
            logger.debug('User email', this._userEmail);
            logger.debug('User login', this._userLogin);
        }
    }

    public isLogged(): boolean {
        return this._isLogged;
    }

    public getUserEmail(): string {
        return this._userEmail;
    }

    public getUserLogin(): string {
        return this._userLogin;
    }
}
