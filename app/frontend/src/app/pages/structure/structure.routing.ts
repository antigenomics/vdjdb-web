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

import { RouterModule, Routes } from '@angular/router';
import { StructurePageComponent } from 'pages/structure/structure.component';

/**
 * One route, and it is the page itself.
 *
 * Everything the page shows - which epitope, which structures are overlaid, a CDR3 query - travels
 * as query parameters rather than as path segments, because the page reads them as a set: changing
 * one has to re-run the same resolution as changing any other, and the cross-page links from Browse
 * and Motif arrive with several at once. `structure.component` owns that reading.
 *
 * forChild, not forRoot: the app module lazy-loads this page, so the chunk boundary is here.
 */
const routes: Routes = [
  { path: '', component: StructurePageComponent }
];

export const StructurePageRouting = RouterModule.forChild(routes);
