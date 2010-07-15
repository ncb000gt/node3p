var sys = require('sys')
,crypto = require('crypto')
,b64decode = require('./lib/base64').decode
,fs = require('fs')
,Buffer = require('buffer').Buffer
,xml2object = require('./lib/xml2object');

var KEY = '\x29\xAB\x9D\x18\xB2\x44\x9E\x31';
var IV = '\x5E\x72\xD7\x9A\x11\xB3\x4F\xEE';

var amz_data = fs.readFileSync(process.argv[2], 'binary');
var b = new Buffer(amz_data.length);
b.write(amz_data, 'binary');

var decipher=(new crypto.Decipher).initiv("des-cbc",KEY,IV);
var amz_xml = decipher.update(b64decode(b), 'binary', 'utf8');
amz_xml += decipher['final']('utf8');

var links = [];

var response = xml2object.parseString(
  amz_xml,
  function(o, obj){
    var tracks = obj.playlist.trackList.track;
    for (var i = 0; i < tracks.length; i++) {
      sys.puts(tracks[i].title);
      links.push(tracks[i].location);
    }

    sys.puts(links);
  }
);
