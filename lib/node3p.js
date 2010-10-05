var sys = require('sys')
,crypto = require('crypto')
,b64decode = require('base64').decode
,fs = require('fs')
,Buffer = require('buffer').Buffer
,xml2js = require('xml2js')
,http = require('http')
,url = require('url')
,request = require('request')
,path = require('path')
,fshelp = require('./file')
,emitter = require('events').EventEmitter;


//TODO: emit an event when finished processing

function Node3p(saveRoot) {
  emitter.call(this);

  this.MAX_DOWNLOADS = 5;
  this.KEY = '\x29\xAB\x9D\x18\xB2\x44\x9E\x31';
  this.IV = '\x5E\x72\xD7\x9A\x11\xB3\x4F\xEE';

  sys.debug('Concurrent downloads limited to ' + this.MAX_DOWNLOADS + '.\n');

  this.saveRoot = saveRoot;
  this.dlCount = 0;
  this.toDLlen = 0;
  this.downloaded = [];

};
sys.inherits(Node3p, emitter);

exports.Node3p = Node3p;

Node3p.prototype.parse = function(file) {
  this
    .on('decrypt', this.decrypt)
    .on('convert', this.convert)
    .on('prepare', this.downloadFiles)
    .on('get', this.getFile)
    .on('downloaded', this.finishedDownload)
    .on('endPrepare', this.endPrepare)
    .on('end', this.onEnd);

  var amz_data = "";
  if (file instanceof Buffer) {
    amz_data = file.toString('ascii', 0, file.length);
  } else {
    amz_data = fs.readFileSync(process.argv[3], 'binary');
  }

  this.emit('decrypt', amz_data);
};

Node3p.prototype.decrypt = function(data) {
  var b = new Buffer(data.length);
  b.write(data, 'binary');

  var decipher=(new crypto.Decipher).initiv("des-cbc", this.KEY, this.IV);
  var amz_xml = decipher.update(b64decode(b), 'binary', 'utf8');
  amz_xml += decipher['final']('utf8');
  this.emit('convert', amz_xml);
};


//parse(decrypt(amz_data))
Node3p.prototype.convert = function(data) {
  var self = this;
  var parser = new xml2js.Parser();
  parser.addListener('end', function(obj) {
		       var toDownload = [];
		       var tracks = obj.trackList.track;
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
			   if (meta['@'].rel == "http://www.amazon.com/dmusic/fileSize") {
			     size = meta['#'];
			   } else if (meta['@'].rel == "http://www.amazon.com/dmusic/albumPrimaryArtist") {
			     primary = meta['#'];
			   }
			 }
			 var track_url = url.parse(track.location, true);
			 var uri = track_url.query.URL;
			 var creator = track.creator;
			 var album = track.album;
			 var title = track.title;

			 //get ready to download
			 toDownload.push({uri: uri, primary: primary||creator, album: album, title: title});
		       }

		       self.toDLlen = toDownload.length;
		       self.emit('prepare', toDownload);
		       //downloadFiles();
		     });

  parser.parseString(data);
};

Node3p.prototype.downloadFiles = function(files) {
  var self = this;
  if (files.length > 0) {
    if (self.dlCount < self.MAX_DOWNLOADS) {
      var o = files.pop();
      this.dlCount++;
      /*sys.puts('primary: '+o.primary);
      sys.puts('album: '+o.album);
      sys.puts('title: '+o.title);*/
      self.emit('get', o.uri, o.primary, o.album, o.title, files.length);
    }
    setTimeout(function() { self.downloadFiles(files); }, 100);
  } else {
    self.emit('endPrepare');
  }
};

Node3p.prototype.finishedDownload = function(filename, primary, album, title) {
  sys.puts('Downloaded: "'+title+'" by "'+ primary+'" to "'+filename+'".');
  this.downloaded.push({filename: filename, primary: primary, album: album, title: title});

  if (this.dlCount == 0 && this.toDLlen == this.downloaded.length) {
    this.emit('end', this.downloaded);
  }
};

Node3p.prototype.getFile = function(uri, primary, album, title, left) {
  var self = this;
  var dirpath = path.join(self.saveRoot, primary, album);
  var filepath = path.join(dirpath, title + '.mp3');
  if (path.existsSync(filepath)) {
    self.dlCount--;
    sys.puts("File '" + filepath + "' exists. Skipping download.");
    return;
  }
  fshelp.mkdirs(dirpath, 0777, function(err) {
		  if (err) throw err;
		  fs.open(filepath, 'w', 0755, function(err, fd) {
			    if (err) throw err;
			    var s = fs.createWriteStream(filepath);
			    s.on('close', function(err) {
				   if (err) throw err;
				   fs.close(fd, function(err) {
					      if (err) throw err;
					      self.dlCount--;
					      self.emit('downloaded', filepath, primary, album, title);
					    });
				 });
			    request({uri: uri, responseBodyStream: s}, function (err, response, stream) {
				      if (err) sys.puts('Error: ' + err);
				    });
			  });

		});
};

Node3p.prototype.endPrepare = function() {
  sys.puts('No more files queued for download. Downloads may be finishing.');
};

Node3p.prototype.onEnd = function(files) {
  sys.puts('Fin.');
};