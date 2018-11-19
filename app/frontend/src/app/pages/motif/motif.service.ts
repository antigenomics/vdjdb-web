/*
 *     Copyright 2017-2018 Bagaev Dmitry
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
import { MotifsMetadata } from 'pages/motif/motif';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { WebSocketConnection } from 'shared/websocket/websocket-connection';
import { LoggerService } from 'utils/logger/logger.service';

export namespace MotifsServiceWebSocketActions {
  export const METADATA = 'meta';
}

@Injectable()
export class MotifService {
  private connection: WebSocketConnection;

  private isMetadataLoaded: boolean = false;
  private isMetadataLoading: boolean = false;
  private metadata: Subject<MotifsMetadata> = new ReplaySubject(1);

  constructor(private logger: LoggerService) {
    this.connection = new WebSocketConnection(logger, true);
  }

  public async load(): Promise<void> {
    if (!this.isMetadataLoaded && !this.isMetadataLoading) {
      this.isMetadataLoading = true;
      this.connection.onOpen(async () => {
        this.logger.debug('Motifs', 'Loading metadata for the first time');
        const request = await this.connection.sendMessage({
          action: MotifsServiceWebSocketActions.METADATA
        });
        const meta = request.get<MotifsMetadata>('metadata');
        this.metadata.next(meta);
        this.logger.debug('Motifs', meta);
        this.isMetadataLoaded = true;
        this.isMetadataLoading = false;
      });
      this.connection.onError(() => {
        this.isMetadataLoading = false;
      });
      this.connection.connect('/api/motifs/connect');
    }
  }

  public getMetadata(): Observable<MotifsMetadata> {
    return this.metadata.asObservable();
  }

}