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

import { SampleItem } from '../sample/sample-item';
import { SampleTag } from '../sample/sample-tag';

export class User {
  public login: string;
  public email: string;
  public samples: SampleItem[];
  public tags: SampleTag[];
  public permissions: UserPermissions;

  constructor(login: string, email: string, samples: any[], tags: any[], permissions: UserPermissions) {
    this.login = login;
    this.email = email;
    this.samples = samples.map((sample) => SampleItem.deserialize(sample));
    this.tags = tags.map((tag) => SampleTag.deserialize(tag, this.samples));
    this.permissions = permissions;

    // Check is tags are valid
    this.samples.forEach((sample) => {
      const index = this.tags.findIndex((tag) => tag.id === sample.tagID);
      if (index === -1) {
        sample.tagID = -1;
      }
    });
  }

  public updateSampleInfo(sampleName: string, readsCount: number, clonotypesCount: number): void {
    const sample = this.samples.find((s) => s.name === sampleName);
    if (sample !== undefined) {
      sample.readsCount = readsCount;
      sample.clonotypesCount = clonotypesCount;
    }
  }

  public static deserialize(input: any): User {
    /* Disable tslint to prevent ClosureCompiler mangling */
    /* tslint:disable:no-string-literal */
    return new User(input[ 'login' ], input[ 'email' ], input[ 'files' ], input[ 'tags' ], UserPermissions.deserialize(input[ 'permissions' ]));
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
    return new UserPermissions(input[ 'maxFilesCount' ], input[ 'maxFileSize' ],
      input[ 'isUploadAllowed' ], input[ 'isDeleteAllowed' ], input[ 'isChangePasswordAllowed' ]);
    /* tslint:enable:no-string-literal */
  }
}

/**
 * The limits in force for this account, resolved by the server.
 *
 * They live in three unrelated places server-side - the permissions table, the annotations config and
 * the auth config - and differ between registered and token accounts, so working out which set applies
 * is done once on the server rather than reimplemented here.
 */
export class AccountLimits {
  /** What the server uses to mean "no ceiling on this row". */
  public static readonly UNLIMITED: number = -1;

  public accountType: string;
  public maxSamples: number;
  public maxFileSizeMb: number;
  public maxClonotypes: number;
  public uploadsPerDay: number;
  public annotationsPerDay: number;
  public sampleRetention: string;
  public accountRetention?: string;

  constructor(accountType: string, maxSamples: number, maxFileSizeMb: number, maxClonotypes: number,
              uploadsPerDay: number, annotationsPerDay: number, sampleRetention: string, accountRetention?: string) {
    this.accountType = accountType;
    this.maxSamples = maxSamples;
    this.maxFileSizeMb = maxFileSizeMb;
    this.maxClonotypes = maxClonotypes;
    this.uploadsPerDay = uploadsPerDay;
    this.annotationsPerDay = annotationsPerDay;
    this.sampleRetention = sampleRetention;
    this.accountRetention = accountRetention;
  }

  public isTokenAccount(): boolean {
    return this.accountType === 'token';
  }

  public static deserialize(input: any): AccountLimits {
    /* Disable tslint to prevent ClosureCompiler mangling */
    /* tslint:disable:no-string-literal */
    return new AccountLimits(input[ 'accountType' ], input[ 'maxSamples' ], input[ 'maxFileSizeMb' ],
      input[ 'maxClonotypes' ], input[ 'uploadsPerDay' ], input[ 'annotationsPerDay' ],
      input[ 'sampleRetention' ], input[ 'accountRetention' ]);
    /* tslint:enable:no-string-literal */
  }
}
