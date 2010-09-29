var sys = require('sys')
,crypto = require('crypto')
,b64decode = require('./lib/base64').decode
,fs = require('fs')
,Buffer = require('buffer').Buffer
,xml2object = require('./lib/xml2object')
,http = require('http')
,url = require('url')
,request = require('request')
,path = require('path')
,fshelp = require('./lib/fshelper.js');

var KEY = '\x29\xAB\x9D\x18\xB2\x44\x9E\x31';
var IV = '\x5E\x72\xD7\x9A\x11\xB3\x4F\xEE';

var saveRoot = process.argv[2];

var amz_data = fs.readFileSync(process.argv[3], 'binary');
sys.puts("data size: " + amz_data.length);
var b = new Buffer(amz_data.length);
b.write(amz_data, 'binary');

var decipher=(new crypto.Decipher).initiv("des-cbc",KEY,IV);
var amz_xml = decipher.update(b64decode(b), 'binary', 'utf8');
amz_xml += decipher['final']('utf8');
sys.puts("xml: " + amz_xml);
var links = [];

var response = xml2object.parseString(
  amz_xml,
  function(o, obj){
    var tracks = obj.playlist.trackList.track;
    if (!(tracks instanceof Array)) {
      tracks = [tracks];
    }

    //sys.puts(sys.inspect(tracks));
    for (var i = 0; i < tracks.length; i++) {
      var track = tracks[i];
      var size;
      var primary;
      var meta_len = track.meta.length;
      for (var j = 0; j < meta_len; j++) {
	var meta = track.meta[j];
	if (meta.attrs().rel == "http://www.amazon.com/dmusic/fileSize") {
	  size = meta.content;
	} else if (meta.attrs().rel == "http://www.amazon.com/dmusic/albumPrimaryArtist") {
	  primary = meta.content;
	}
      }
      var track_url = url.parse(track.location.content, true);
      var u = track_url.query.URL;
      links.push({url: u, size: size, primary: primary, creator: track.creator.content, album: track.album.content, title: track.title.content });
    }

    var link = links[0];
    sys.puts('link: ' +sys.inspect(link));
    var p = url.parse(link.url);
    sys.puts('creator: ' + link.creator);
    sys.puts('album: ' + link.album);
    sys.puts('title: ' + link.title);

    sys.debug('saveRoot: '+saveRoot);
    var dirpath = path.join(saveRoot, primary, link.album);
    var filepath = path.join(dirpath, link.title + '.mp3');

    fshelp.mkdirs(dirpath, 0777, function(err) {
		    if (err) throw err;
		    fs.open(filepath, 'w', 666, function(err, fd) {
			      request({uri: links[0].url, responseBodyStream: fs.createWriteStream(filepath)}, function (err, response, stream) {
					if (err) sys.puts('there was a problem scotty');
					stream.on('end', function() {
						    fs.close(fd, function(err) {
							       sys.puts('File has been written, try it out.');
							     });
						  });
				      });
			    });

		  });
  }
);