var stream   = require('stream');
var util     = require('util');
var strftime = require('strftime');
var aws      = require('aws-sdk');

// Public API

function S3StreamLogger(options){
    stream.Writable.call(this, options);

    if(!(options.bucket || process.env.BUCKET_NAME))
        throw new Error("options.bucket or BUCKET_NAME environment variable is required");
    if(!(options.access_key_id || process.env.AWS_SECRET_KEY_ID))
        throw new Error("options.access_key_id or AWS_SECRET_KEY_ID environment variable is required");
    if(!(options.secret_access_key || process.env.AWS_SECRET_ACCESS_KEY))
        throw new Error("options.secret_access_key or AWS_SECRET_ACCESS_KEY environment variable is required");
    
    this.bucket        = options.bucket || process.env.BUCKET_NAME;
    this.name_format   = options.name_format   || '%Y-%m-%d-%H-%M-unknown-unknown.log';
    this.rotate_every  = options.rotate_every  || 60*60*1000; // default to 60 minutes
    this.max_file_size = options.max_file_size || 200000      // or 200k, whichever is sooner
    this.upload_every  = options.upload_every  || 20*1000;    // default to 20 seconds
    this.buffer_size   = options.buffer_size   || 10000;      // or every 10k, which ever is sooner

    this.s3           = new aws.S3({
        secretAccessKey: options.secret_access_key,
            accessKeyId: options.access_key_id,
             sslEnabled:true
    });
    this.timeout      = null;
    this.object_name  = null;
    this.file_started = null;
    this.last_write   = null;
    this.buffers      = [];
    this.unwritten    = 0;
    this.file_size    = 0;

    this._newFile();
}
util.inherits(S3StreamLogger, stream.Writable);

// write anything outstanding to the current file, and start a new one
S3StreamLogger.prototype.flushFile = function(){
    this._upload();
    this._newFile();
}


// Private API

S3StreamLogger.prototype._upload = function(){
    var buffer    = Buffer.concat(this.buffers);

    this.s3.putObject({
            Bucket: this.bucket,
               Key: this.object_name,
              Body: buffer
    }, function(err){
        if(err){
            this.emit('error', err);
        }
    }.bind(this));
    
    this.unwritten = 0;
    if(this.timeout)
        clearTimeout(this.timeout);
    
    if((new Date()).getTime() - this.file_started.getTime() > this.rotate_every ||
       buffer.length > this.max_file_size){
        this._newFile();
    }
}

// _newFile should ONLY be called when there is no un-uploaded data (i.e.
// immediately after _upload), otherwise data will be lost
S3StreamLogger.prototype._newFile = function(){
    this.buffers      = [];
    this.unwritten    = 0;
    this.file_started = new Date();
    this.last_write   = this.file_started;
    // create a date object with the UTC version of the date to use with
    // strftime, so that the commonly use formatters return the UTC values.
    // This breaks timezone-converting specifers (as they will convert against
    // the wrong timezone).
    var date_as_utc = new Date(
        this.file_started.getUTCFullYear(),
        this.file_started.getUTCMonth(),
        this.file_started.getUTCDate(),
        this.file_started.getUTCHours(),
        this.file_started.getUTCMinutes(),
        this.file_started.getUTCSeconds()
    );
    this.object_name  = strftime(this.name_format, date_as_utc);
}

S3StreamLogger.prototype._write = function(chunk, encoding, cb){
    if(typeof chunk === 'string')
        chunk = new Buffer(chunk, encoding);
    
    if(chunk){
        this.buffers.push(chunk);
        this.unwritten += chunk.length;
    }

    if(this.timeout)
        clearTimeout(this.timeout);
    
    if((new Date()).getTime() - this.last_write.getTime() > this.upload_every ||
       this.unwritten > this.buffer_size){
        this._upload();
    }else{
        this.timeout = setTimeout(function(){
            this._upload();
            this.timeout = null;
        }.bind(this), this.upload_every);
    }

    
    // Call the callback immediately, as we may not actually write for some
    // time. If there is an upload error, we trigger our 'error' event.
    if(cb && typeof cb === 'function')
        process.nextTick(cb);
};

module.exports = {
    S3StreamLogger: S3StreamLogger
};

