/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { User } from 'shared/user/user';
import { LoggerService } from 'utils/logger/logger.service';
import { AnnotationsService, AnnotationsServiceEvents } from '../annotations.service';

@Injectable()
export class UserResolver implements Resolve<User> {

    constructor(private annotationService: AnnotationsService, private logger: LoggerService) {
    }

    public resolve(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<User> | Promise<User> | User {
        this.logger.debug('UserResolver', 'Resolving');
        return new Promise<User>((resolve) => {
            if (this.annotationService.isInitialized()) {
                resolve(this.getUser());
            } else {
                this.annotationService.getEvents().pipe(filter((event) => {
                    return event === AnnotationsServiceEvents.INITIALIZED;
                }), take(1)).subscribe(() => {
                    resolve(this.getUser());
                });
            }
        });
    }

    private getUser(): User {
        const user = this.annotationService.getUser();
        this.logger.debug('UserResolver: resolved', user);
        return user;
    }
}
