/*
This file is part of Node3p.

Node3p is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Node3p is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Node3p.  If not, see <http://www.gnu.org/licenses/>.
*/

var sys = require('sys')
,crypto = require('crypto')
,b64decode = require('base64').decode
,fs = require('fs')
,xml2js = require('xml2js')
,http = require('http')
,url = require('url')
,request = require('request')
,path = require('path')
,fshelp = require('./file')
,emitter = require('events').EventEmitter;

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
    .on('skipped', this.skipped)
    .on('endPrepare', this.endPrepare)
    .on('end', this.onEnd);

  var amz_data = "";
  if (file instanceof Buffer) {
    amz_data = file.toString('ascii', 0, file.length);
  } else {
    amz_data = fs.readFileSync(file, 'binary');
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
			 var size, primary, genre, discNum;
			 var meta_len = track.meta.length;
			 for (var j = 0; j < meta_len; j++) {
			   var meta = track.meta[j];
			   if (meta['@'].rel == "http://www.amazon.com/dmusic/fileSize") {
			     size = meta['#'];
			   } else if (meta['@'].rel == "http://www.amazon.com/dmusic/albumPrimaryArtist") {
			     primary = meta['#'];
			   } else if (meta['@'].rel == "http://www.amazon.com/dmusic/primaryGenre") {
			     genre = meta['#'];
			   } else if (meta['@'].rel == "http://www.amazon.com/dmusic/discNum") {
			     discNum = meta['#'];
			   }
			 }
			 var track_url = url.parse(track.location, true);
			 var uri = track_url.query.URL;

			 //get ready to download
			 toDownload.push({
					   uri: uri,
					   primary: primary || track.creator,
					   album: track.album,
					   title: track.title.replace(/\'/g, '').replace(/\//g,'-'),
					   genre: genre,
					   image: track.image,
					   size: size,
					   duration: track.duration
					 });
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
      var uri = o.uri;
      delete o['uri'];
      self.emit('get', uri, o);
    }
    setTimeout(function() { self.downloadFiles(files); }, 100);
  } else {
    self.emit('endPrepare');
  }
};

Node3p.prototype.finishedDownload = function(o) {
  sys.puts('Downloaded: "'+o.title+'" by "'+o.primary+'" to "'+o.filename+'".');
  this.downloaded.push(o);

  if (this.dlCount == 0 && this.toDLlen == this.downloaded.length) {
    this.emit('end', this.downloaded);
  }
};

Node3p.prototype.skipped = function(o, reason) {
  sys.puts('Skipped download: "'+o.title+'" by "'+o.primary+'" to "'+o.filename+'". Reason: ' + reason);
  this.downloaded.push(o);

  if (this.dlCount == 0 && this.toDLlen == this.downloaded.length) {
    this.emit('end', this.downloaded);
  }
};

Node3p.prototype.getFile = function(uri, o) {
  var self = this;
  var dirpath = path.join(self.saveRoot, o.primary, o.album);
  var filepath = path.join(dirpath, o.title + '.mp3');
  o.filename = filepath;
  //TODO: make this smarter, use the bytecount to be sure.
  if (fs.existsSync(filepath)) {
    self.dlCount--;
    self.emit('skipped', o, "Already have the file.");
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
					      self.emit('downloaded', o);
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