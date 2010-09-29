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

var MAX_DOWNLOADS = 5;
var KEY = '\x29\xAB\x9D\x18\xB2\x44\x9E\x31';
var IV = '\x5E\x72\xD7\x9A\x11\xB3\x4F\xEE';

var saveRoot = process.argv[2];

var amz_data = fs.readFileSync(process.argv[3], 'binary');
//sys.puts("data size: " + amz_data.length);
var b = new Buffer(amz_data.length);
b.write(amz_data, 'binary');

var decipher=(new crypto.Decipher).initiv("des-cbc",KEY,IV);
var amz_xml = decipher.update(b64decode(b), 'binary', 'utf8');
amz_xml += decipher['final']('utf8');
//sys.puts("xml: " + amz_xml);
var toDownload = [];
var dlCount = 0;
var canDownload = true;

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
      var uri = track_url.query.URL;
      var creator = track.creator.content;
      var album = track.album.content;
      var title = track.title.content;

      //get ready to download
      /*sys.puts('creator: ' + creator);
      sys.puts('album: ' + album);
      sys.puts('title: ' + title);*/
      //sys.debug('saveRoot: '+saveRoot);
      toDownload.push({uri: uri, primary: primary||creator, album: album, title: title});
    }


    downloadFiles();
  }
);

function downloadFiles() {
  if (toDownload.length > 0) {
    if (dlCount < MAX_DOWNLOADS) {
      var o = toDownload.pop();
      sys.puts('primary: ' + o.primary);
      sys.puts('album: ' + o.album);
      sys.puts('title: ' + o.title);
      dlCount++;
      getFile(o.uri, o.primary, o.album, o.title);
    }
    setTimeout(downloadFiles, 1000);
  } else {
    sys.puts('No more files to enqueued for download. Finishing the download.');
  }
}

function checkDL() {
  sys.debug('checkDL - dlCount: ' + dlCount);
  while (dlCount >= MAX_DOWNLOADS) {
    setTimeout(function() {}, 1000);
  }
  return;
}

function getFile(uri, primary, album, title) {
  var dirpath = path.join(saveRoot, primary, album);
  var filepath = path.join(dirpath, title + '.mp3');
  sys.puts("Writing '"+filepath+"'...");
  fshelp.mkdirs(dirpath, 0777, function(err) {
		  if (err) throw err;
		  fs.open(filepath, 'w', 0755, function(err, fd) {
			    if (err) throw err;
			    var s = fs.createWriteStream(filepath);
			    s.on('close', function(err) {
				   if (err) throw err;
				   fs.close(fd, function(err) {
					      if (err) throw err;
					      sys.puts("File '"+filepath+"' has been written, try it out.");
					      dlCount--;
					    });
				 });
			    request({uri: uri, responseBodyStream: s}, function (err, response, stream) {
				      if (err) sys.puts('there was a problem scotty');
				    });
			  });

		});
};