## s3-streamlogger

A Writable Stream object that uploads to s3 objects, periodically rotating to a
new object name.

### Installation
```bash
npm install --save s3-streamlogged
```

### Usage
```js
var S3StreamLogger = require('s3-streamlogger').S3StreamLogger;

var s3stream = new S3SteamLogger({
               bucket: "mys3bucket",
        access_key_id: "...",
    secret_access_key: "..."
});
```


### Options

    if(!(options.bucket || process.env.BUCKET_NAME))
        throw new Error("options.bucket or BUCKET_NAME environment variable is required");
    if(!(options.access_key_id || process.env.AWS_SECRET_KEY_ID))
        throw new Error("options.access_key_id or AWS_SECRET_KEY_ID environment variable is required");
    if(!(options.secret_access_key || process.env.AWS_SECRET_ACCESS_KEY))
        throw new Error("options.secret_access_key or AWS_SECRET_ACCESS_KEY environment variable is required");
    
    this.bucket        = options.bucket || process.env.BUCKET_NAME;
    this.name_format   = options.name_format   || '%Y-%m-%d-%H-%M.log';
    this.rotate_every  = options.rotate_every  || 60*60*1000; // default to 60 minutes
    this.max_file_size = options.max_file_size || 200000      // or 200k, whichever is sooner
    this.upload_every  = options.upload_every  || 20*1000;    // default to 20 seconds
    this.buffer_size   = options.buffer_size   || 10000;      // or every 10k, which ever is sooner


#### bucket *required*
Name of the S3 bucket to upload data to. Must exist.
Can also be provided as the environment variable `BUCKET_NAME`.

#### access_key_id *required*
AWS access key ID, must have putObject permission on the specified bucket.
Can also be provided as the environment variable `AWS_SECRET_ACCESS_KEY`.

#### secret_access_key *required*
AWS secret key for the `access_key_id` specified.
Can also be provided as the environment variable `AWS_SECRET_KEY_ID`.

#### name_format
Format of file names to create, accepts [strftime specifiers](https://github.com/samsonjs/strftime). Defaults to `"%Y-%m-%d-%H-%M.log"`.

#### rotate_every
Files will be rotated every `rotate_every` milliseconds. Defaults to 3600000 (60
minutes).

#### max_file_sze
Files will be rotated when they reach `max_file_size` bytes. Defaults to 200 KB.

#### upload_every
Files will be uploaded every `upload_every` milliseconds. Defaults to 20
seconds.

#### buffer_size
Files will be uploaded if the un-uploaded data exceeds `buffer_size` bytes.
Defaults to 10 KB.


