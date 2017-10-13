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

var fs = require('fs');

// relocate default config
fs.writeFileSync('node_modules/semantic-ui-less/theme.config', "@import '../../styles/semantic/theme.config';\n", 'utf8');

// fix well known bug with default distribution
fixFontPath('node_modules/semantic-ui-less/themes/default/globals/site.variables');
fixFontPath('node_modules/semantic-ui-less/themes/flat/globals/site.variables');
fixFontPath('node_modules/semantic-ui-less/themes/material/globals/site.variables');

function fixFontPath(filename) {
    var content = fs.readFileSync(filename, 'utf8');
    var newContent = content.replace(
        "@fontPath  : '../../themes/",
        "@fontPath  : '../../../themes/"
    );
    fs.writeFileSync(filename, newContent, 'utf8');
}