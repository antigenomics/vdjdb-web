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
import { WebSocketConnection } from 'shared/websocket/websocket-connection';
import { LoggerService } from 'utils/logger/logger.service';

export namespace MotifsServiceWebSocketActions {
  export const METADATA = 'meta';
}

@Injectable()
export class MotifService {

  private connection: WebSocketConnection;

  constructor(private logger: LoggerService) {
    this.connection = new WebSocketConnection(logger, true);
    this.connection.connect('/api/motifs/connect');
  }

  public async load(): Promise<void> {
    const metadata = await this.connection.sendMessage({
      action: MotifsServiceWebSocketActions.METADATA
    });
    this.logger.debug('Motif', metadata.get('metadata'));
  }

}