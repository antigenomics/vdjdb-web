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
import { LoggerService } from 'utils/logger/logger.service';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly isLocalStorageAvailable: boolean;

  constructor(private logger: LoggerService) {
    this.isLocalStorageAvailable = window.localStorage !== undefined;
  }

  public save<T>(key: string, data: T): void {
    if (this.isLocalStorageAvailable) {
      this.logger.debug('LocalStorage', `Saved data for ${key}`);
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      this.logger.debug('LocalStorage', 'Save unavailable');
    }
  }

  public get<T>(key: string): T | undefined {
    if (this.isLocalStorageAvailable) {
      this.logger.debug('LocalStorage', `Get data for ${key}`);
      const item = localStorage.getItem(key);
      if (typeof item === 'string') {
        return JSON.parse(item) as T;
      } else {
        return undefined;
      }
    } else {
      this.logger.debug('LocalStorage', 'Get unavailable');
      return undefined;
    }
  }

  public remove(key: string): void {
    if (this.isLocalStorageAvailable) {
      this.logger.debug('LocalStorage', `Remove data for ${key}`);
      localStorage.removeItem(key);
    } else {
      this.logger.debug('LocalStorage', 'Remove unavailable');
    }
  }
}
