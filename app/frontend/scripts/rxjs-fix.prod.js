const glob = require('glob');
const path = require('path');
const fs = require('fs');
const rxjsDistOperatorFiles = glob.sync('./lib/rxjs-dist/rxjs/add/operator/*.js');


rxjsDistOperatorFiles.forEach(function(fileName) {
    const baseName = path.basename(fileName).split('.')[0];
    const appendContent = '\nexports.__RXJS_OPERATOR_' + baseName.toUpperCase() + '_CLOSURE_WORKAROUND__ = \'' + baseName + '\';';
    fs.appendFileSync(fileName, appendContent)
});