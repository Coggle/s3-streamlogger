var stream   = require('stream');
var util     = require('util');
var strftime = require('strftime');
var aws      = require('aws-sdk');
var branch   = require('git-branch');
var os       = require('os');
var zlib     = require('zlib');

// Constants

var SERVER_SIDE_ENCRYPTION = "AES256";

// Public API

function S3StreamLogger(options){
    stream.Writable.call(this, options);

    if(!(options.bucket || process.env.BUCKET_NAME))
        throw new Error("options.bucket or BUCKET_NAME environment variable is required");

    this.bucket                 = options.bucket || process.env.BUCKET_NAME;
    this.folder                 = options.folder || '';
    this.tags                   = options.tags || {};                  // no tags are assigned by default
    this.name_format            = options.name_format;
    this.object_name_creator    = options.object_name_creator;
    this.rotate_every           = options.rotate_every  || 60*60*1000; // default to 60 minutes
    this.max_file_size          = options.max_file_size || 200000;     // or 200k, whichever is sooner
    this.upload_every           = options.upload_every  || 20*1000;    // default to 20 seconds
    this.buffer_size            = options.buffer_size   || 10000;      // or every 10k, which ever is sooner
    this.server_side_encryption = options.server_side_encryption || false;
    this.acl                    = options.acl || false;
    this.compress               = options.compress || false;

    // Backwards compatible API changes

    options.config = options.config || {};
    if(options.access_key_id) {
      options.config.accessKeyId = options.access_key_id;
    }
    if(options.secret_access_key) {
      options.config.secretAccessKey = options.secret_access_key;
    }
    if(options.config.sslEnabled === undefined) {
      options.config.sslEnabled = true;
    }
    if(!options.name_format) {
        // Get branch and host name for default file name
        var _current_branch;
        try {
            _current_branch = branch.sync();
        } catch (e) {
            _current_branch = 'unknown'
        }
        var _extension = '.log';
        if(this.compress){
            _extension += '.gz';
        }
        this.name_format = `%Y-%m-%d-%H-%M-%S-%L-${_current_branch}-${os.hostname()}${_extension}`;
    }

    this.s3           = new aws.S3(options.config);
    this.timeout      = null;
    this.object_name  = null;
    this.file_started = null;
    this.last_write   = null;
    this.buffers      = [];
    this.unwritten    = 0;

    this._newFile();
}
util.inherits(S3StreamLogger, stream.Writable);

// write anything outstanding to the current file, and start a new one
S3StreamLogger.prototype.flushFile = function(){
    this._upload(true);
};

// Private API

S3StreamLogger.prototype._upload = function(forceNewFile) {
    if(this.timeout){
        clearTimeout(this.timeout);
        this.timeout = null;
    }
    this.last_write = new Date();

    var saved = {
        buffers: undefined,
        unwritten: this.unwritten,
        object_name: this.object_name
    };
    // if we're erasing the data, then take a temporary copy of it until we
    // know the upload has succeeded. If it fails (either due to compression or
    // upload failure) we will re-instate it:

    this.unwritten = 0;

    var elapsed = (new Date()).getTime() - this.file_started.getTime();
    if(forceNewFile ||
       elapsed > this.rotate_every ||
       this._fileSize() > this.max_file_size){
        saved.buffers = this.buffers;
        this._newFile();
    }

    this._prepareBuffer(function(err, buffer){
        if(err){
            this._restoreUnwritten(saved.unwritten, saved.object_name, saved.buffers);
            return this.emit('error', err);
        }

        // constructc the tagging string according to AWS SDK specifications
        var tagging = Object.keys(this.tags).map(function(key) {return key + '=' + this.tags[key];}, this).join('&');

        var param  = {
            Bucket: this.bucket,
            Key: this.object_name,
            Body: buffer,
            Tagging: tagging
        };

        if(this.server_side_encryption){
            param.ServerSideEncryption = SERVER_SIDE_ENCRYPTION;
        }

        if(this.acl){
            param.ACL = this.acl;
        }

        // do everything else before calling putObject to avoid the
        // possibility that this._write is called again, losing data.
        this.s3.putObject(param, function(err){
            if(err){
                this._restoreUnwritten(saved.unwritten, saved.object_name, saved.buffers);
                this.emit('error', err);
            }
        }.bind(this));
    }.bind(this));
};

S3StreamLogger.prototype._prepareBuffer = function(cb) {
    var buffer = Buffer.concat(this.buffers);
    if(this.compress){
        zlib.gzip(buffer, cb);
    }else{
        cb(null, buffer);
    }
    return null;
};

S3StreamLogger.prototype._fileSize = function(){
    return this.buffers.map(function(b){return b.length;}).reduce(function(s, v){return s + v;}, 0);
};

// _newFile should ONLY be called when there is no un-uploaded data (i.e.
// from _upload or initialization), otherwise data will be lost.
S3StreamLogger.prototype._newFile = function(){
    this.buffers      = [];
    this.file_started = new Date();
    this.last_write   = this.file_started;
    // create a date object with the UTC version of the date to use with
    // strftime, so that the commonly use formatters return the UTC values.
    // This breaks timezone-converting specifiers (as they will convert against
    // the wrong timezone).
    var date_as_utc = new Date(
        this.file_started.getUTCFullYear(),
        this.file_started.getUTCMonth(),
        this.file_started.getUTCDate(),
        this.file_started.getUTCHours(),
        this.file_started.getUTCMinutes(),
        this.file_started.getUTCSeconds(),
        this.file_started.getUTCMilliseconds()
    );
    if (this.object_name_creator) {
        this.object_name = this.object_name_creator();
    } else {
        this.object_name  =  (this.folder === '' ? '' : this.folder + '/') + strftime(this.name_format, date_as_utc);
    }
};

// restore unwritten data in the event that a write failed.
S3StreamLogger.prototype._restoreUnwritten = function(unwritten, object_name, buffers){
    // If no data was erased, then only the unwritten counter needs correcting:
    this.unwritten += unwritten;
    // If there is data to restore, then switch back to the previous filename
    // and restore it:
    if(typeof buffers !== 'undefined'){
        this.buffers = buffers.concat(this.buffers);
        this.object_name = object_name;
    }
};

S3StreamLogger.prototype._write = function(chunk, encoding, cb){
    if(typeof chunk === 'string')
        chunk = new Buffer(chunk, encoding);

    if(chunk){
        this.buffers.push(chunk);
        this.unwritten += chunk.length;
    }

    if(this.timeout){
        clearTimeout(this.timeout);
        this.timeout = null;
    }

    if((new Date()).getTime() - this.last_write.getTime() > this.upload_every ||
       this.unwritten > this.buffer_size){
        this._upload();
    }else{
        this.timeout = setTimeout(function(){
            this._upload();
        }.bind(this), this.upload_every);
    }


    // Call the callback immediately, as we may not actually write for some
    // time. If there is an upload error, we trigger our 'error' event.
    if(cb && typeof cb === 'function')
        setImmediate(cb);
};

module.exports = {
    S3StreamLogger: S3StreamLogger
};

