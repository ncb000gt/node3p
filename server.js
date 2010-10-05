var connect = require('connect')
,sys = require('sys')
,forms = require('formidable')
,node3p = require('./lib/node3p')
,jade = require('jade');

var DOWNLOAD_LOCATION = '/home/ncampbell/Music/Amazon MP3/';
var WEB_ROOT = 'web';

function index(app) {
  app.get('/', function (req, res) {
	    res.writeHead(200, { "Content-Type": "text/html" });
	    jade.renderFile(
	      WEB_ROOT + '/templates/index.jade',
	      { },
	      function(err, html){
		res.end(html);
	      }
	    );
	  });
  app.post('/', function (req, res) {
             sys.debug('uploading!');
	     var file_info = {};
	     var headers = {};
	     var form = new forms.IncomingForm();
	     var amz_data, filename;
	     /*form.onPart = function(part){
               if(part.name == "upload"){
		 filename = part.filename;
		 var total = 0;
		 var buffer = new Buffer(parseInt(req.headers['content-length']));
		 part.on('data', function(data){
			   data.copy(buffer, total, 0);
			   total += data.length;
			   sys.debug('buffered datas: ' + total);
			 });
		 part.on('end', function(){
			   amz_data = buffer.slice(0, total);

			   sys.debug('end has happened, time to rock the download.');
			   var n3p = new node3p.Node3p(DOWNLOAD_LOCATION);

			   n3p.on('end', function(files) {
				    sys.puts('All files downloaded');
				  });

			   sys.debug(amz_data instanceof Buffer);
			   sys.debug(amz_data.toString());
			   n3p.parse(amz_data);
			 });
               } else {
		 form.handlePart(part);
               }
	     };*/
	     form.parse(req, function(err, fields, files){
			  res.writeHead(200, { "Content-Type": "text/html" });

			  var n3p = new node3p.Node3p(DOWNLOAD_LOCATION);

			  n3p.on('end', function(files) {
				   sys.puts('All files downloaded');
				 });

			  var file = files.file;
			  n3p.parse(file.path);

			  jade.renderFile(
			    WEB_ROOT + '/templates/uploaded.jade',
			    { },
			    function(err, html){
			      res.end(html);
			    }
			  );
			});
	   });
}

var server = connect.createServer(
  connect.logger({buffer: true}),
  connect.staticProvider(__dirname + '/' + WEB_ROOT + '/static')
);

server.use(connect.router(index));

module.exports = server;