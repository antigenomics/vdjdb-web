/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

import { SampleItem } from '../sample/sample-item';

export class User {
    public login: string;
    public email: string;
    public samples: SampleItem[];
    public permissions: UserPermissions;

    constructor(login: string, email: string, samples: any[], permissions: UserPermissions) {
        this.login = login;
        this.email = email;
        this.samples = samples.map((sample) => SampleItem.deserialize(sample));
        this.permissions = permissions;
    }

    public static deserialize(input: any): User {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        return new User(input['login'], input['email'], input['files'], UserPermissions.deserialize(input['permissions']));
        /* tslint:enable:no-string-literal */
    }
}

export class UserPermissions {
    private static bytesInKiB: number = 1024;
    private static kibInMiB: number = 1024;

    public maxFilesCount: number;
    public maxFileSize: number;
    public isUploadAllowed: boolean;
    public isDeleteAllowed: boolean;
    public isChangePasswordAllowed: boolean;

    constructor(maxFilesCount: number, maxFileSize: number, isUploadAllowed: boolean, isDeleteAllowed: boolean, isChangePasswordAllowed: boolean) {
        this.maxFilesCount = maxFilesCount;
        this.maxFileSize = maxFileSize;
        this.isUploadAllowed = isUploadAllowed;
        this.isDeleteAllowed = isDeleteAllowed;
        this.isChangePasswordAllowed = isChangePasswordAllowed;
    }

    public getMaxFileSizeInBytes(): number {
        return this.maxFileSize * UserPermissions.bytesInKiB * UserPermissions.kibInMiB;
    }

    public static deserialize(input: any): UserPermissions {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        return new UserPermissions(input['maxFilesCount'], input['maxFileSize'],
            input['isUploadAllowed'], input['isDeleteAllowed'], input['isChangePasswordAllowed']);
        /* tslint:enable:no-string-literal */
    }
}
