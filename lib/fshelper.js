var fs = require('fs')
,path = require('path');

exports.mkdirs = function(dirPath, mode, cb, endPath) {
  var splitPath = dirPath.split('/');
  var triedPath = "";
  var len = splitPath.length;
  var i = 1;
  for (i; i < len; i++) {
    var p = splitPath[i];
    triedPath = path.join(triedPath, p);
    var exists = path.existsSync(triedPath);
    if (!exists) {
      fs.mkdir(triedPath, mode, function(err) { if (err) cb(err); });
    }
  }
  cb(null);
};