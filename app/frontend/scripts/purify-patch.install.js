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

const glob = require('glob');
const path = require('path');
const fs = require('fs');
const concatSourceSourceFilePath = path.resolve(__dirname, '../node_modules/purifycss-webpack/node_modules/webpack-sources/lib/ConcatSource.js');

if (fs.existsSync(concatSourceSourceFilePath)) {
    // return typeof item === "string" ? item : item.source();
    // to
    // return typeof item === "string" ? item : typeof item == "undefined" ? "" : item.source();
    // and
    // return typeof item === "string" ? item.length : item.size();
    // to
    // return typeof item === "string" ? item.length : typeof item == "undefined" ? 0 : item.size();


    let content = fs.readFileSync(concatSourceSourceFilePath, 'utf8');
    if (content) {
        console.log('Patching ' + concatSourceSourceFilePath);

        let r1 = /return typeof item === "string" \? item : item.source\(\);/g;
        let s1 = 'return typeof item === "string" ? item : typeof item == "undefined" ? "" : item.source();';

        let r2 = /return typeof item === "string" \? item.length : item.size\(\);/g;
        let s2 = 'return typeof item === "string" ? item.length : typeof item == "undefined" ? 0 : item.size();';

        content = content.replace(r1, s1);
        content = content.replace(r2, s2);
        fs.writeFileSync(concatSourceSourceFilePath, content, 'utf8');
    }
}
