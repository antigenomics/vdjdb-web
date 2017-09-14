const fs = require("fs");
const path = require('path');
const pathToBundle = path.resolve(__dirname, '../../../public/bundles/');

const jsBundleStats = fs.statSync(pathToBundle + '/bundle.min.js');
const jsBundleFileSizeKB = (jsBundleStats.size / 1024.0);

console.log(jsBundleFileSizeKB);
