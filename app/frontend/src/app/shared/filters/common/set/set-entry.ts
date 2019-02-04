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

export class SetEntry {
  public value: string = '';
  public display: string = '';
  public disabled: boolean = false;

  constructor(value: string, display: string, disabled: boolean) {
    this.value = value;
    this.display = display;
    this.disabled = disabled;
  }

  public static toString(entries: SetEntry[]): string {
    return entries
      .filter((entry: SetEntry) => !entry.disabled)
      .map((entry: SetEntry) => entry.value)
      .join(',');
  }
}
