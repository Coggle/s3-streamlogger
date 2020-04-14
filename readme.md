## s3-streamlogger
[![NPM version](https://badge.fury.io/js/s3-streamlogger.svg)](http://badge.fury.io/js/s3-streamlogger)


A Writable Stream object that uploads to s3 objects, periodically rotating to a
new object name.

See also [tails3](http://github.com/coggle/tails3) for a script to tail the log
files produced by s3-streamlogger.

### Installation
```bash
npm install --save s3-streamlogger
```

### Basic Usage
```js
var S3StreamLogger = require('s3-streamlogger').S3StreamLogger;

var s3stream = new S3StreamLogger({
             bucket: "mys3bucket",
      access_key_id: "...",
  secret_access_key: "..."
});

s3stream.write("hello S3");
```

### Use with Winston: Log to S3
```sh
npm install --save winston
npm install --save s3-streamlogger
```

```js
var winston        = require('winston');
var S3StreamLogger = require('s3-streamlogger').S3StreamLogger;

var s3_stream = new S3StreamLogger({
             bucket: "mys3bucket",
      access_key_id: "...",
  secret_access_key: "..."
});

var transport = new (winston.transports.Stream)({
  stream: s3_stream
});
// see error handling section below
transport.on('error', function(err){/* ... */});

var logger = winston.createLogger({
  transports: [transport]
});

logger.info('Hello Winston!');
```

### Define subfolder
```js
var S3StreamLogger = require('s3-streamlogger').S3StreamLogger;

var s3stream = new S3StreamLogger({
             bucket: "mys3bucket",
             folder: "my/nested/subfolder",
      access_key_id: "...",
  secret_access_key: "..."
});

s3stream.write("hello S3");
```

### Assign tags
```js
var S3StreamLogger = require('s3-streamlogger').S3StreamLogger;

var s3stream = new S3StreamLogger({
             bucket: "mys3bucket",
             folder: "my/nested/subfolder",
               tags: {type: 'myType', project: 'myProject'},
      access_key_id: "...",
  secret_access_key: "..."
});

s3stream.write("hello S3");
```

### Add hostname information for tails3
tails3 expects messages to be logged as json (the default for the file
transport), with hostname and (for critical errors), stack properties to each
log object, in addition to the standard timestamp, level and message
properties. You can provide these using the third "metadata" option to
winston's log method:

```js
logger.log(level, message, {hostname: ... , stack: ...});
```

### Handling logging errors
When there is an error writing to s3, the stream emits an 'error' event with
details. You should take care **not** to log these errors back to the same
stream (as that is likely to cause infinite recursion). Instead log them to the
console, to a file, or to SNS using [winston-sns](https://github.com/jesseditson/winston-sns).

Note that these errors will result in uncaught exceptions unless you have an
`error` event handler registered, for example:

```js
s3_stream.on('error', function(err){
    // there was an error!
    some_other_logging_transport.log('error', 'logging transport error', err)
});
```

When using s3-streamlogger with the Winston Stream transport, the Stream transport
attaches its own error handler to the stream, so you do not need your own,
however it will re-emit the errors on itself which must be handled instead:

```js
var transport = new (winston.transports.Stream)({
  stream: s3_stream
});
transport.on('error', function(err){
  /* handle s3 stream errors (e.g. invalid credentials, EHOSTDOWN) here */
});

var logger = winston.createLogger({
  transports: [transport]
});
```

### Options

#### bucket *(required)*
Name of the S3 bucket to upload data to. Must exist.
Can also be provided as the environment variable `BUCKET_NAME`.

#### folder
An optional folder to stream log files to. Takes a path string,
eg: "my/subfolder" or "nested".

#### tags
An optional set of tags to assign to the log files. Takes an object,
eg: `{type: "myType"}` or `{type: "myType", project: "myProject"}`.

#### access_key_id
AWS access key ID, must have putObject permission on the specified bucket.  Can
also be provided as the environment variable `AWS_SECRET_ACCESS_KEY`, or as any
of the other [authentication
methods](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html)
supported by the AWS SDK.

#### secret_access_key
AWS secret key for the `access_key_id` specified.  Can also be provided as the
environment variable `AWS_SECRET_KEY_ID`, or as any of the other
[authentication
methods](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html)
supported by the AWS SDK.

#### config

Configuration object for the AWS SDK. The full list of options is available on the [AWS SDK Configuration Object page](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html). This is an alternative to using access_key_id and secret_access_key and is overwritten by them if both are used.

#### name_format
Format of file names to create, accepts [strftime specifiers](https://github.com/samsonjs/strftime). Defaults to `"%Y-%m-%d-%H-%M-%S-%L-<current git branch>-<hostname>.log"`. The Date() used to fill the format specifiers is created with the current UTC time, but still *has the current timezone*, so any specifiers that perform timezone conversion will return incorrect dates.

If you use a format of the form `%Y-%m-%d-%H-%M-<stage>-<hostname>.log`, then
you can use [tails3](http://github.com/coggle/tails3) to tail the log files
being generated by `S3StreamLogger`.

If `compress` is set to true, then the default extension is `.log.gz` instead of
`.log`.

#### rotate_every
Files will be rotated every `rotate_every` milliseconds. Defaults to 3600000 (60
minutes).

#### max_file_size
Files will be rotated when they reach `max_file_size` bytes. Defaults to 200 KB.

#### upload_every
Files will be uploaded every `upload_every` milliseconds. Defaults to 20
seconds.

#### buffer_size
Files will be uploaded if the un-uploaded data exceeds `buffer_size` bytes.
Defaults to 10 KB.

#### server_side_encryption
The server side encryption `AES256` algorithm used when storing objects in S3.
Defaults to false.

#### storage_class
The S3 StorageClass (STANDARD, REDUCED_REDUNDANCY, etc.). If omitted, no value
is used and aws-sdk will fill in its default.

#### acl
The canned ACL (access control list) to apply to uploaded objects.
Defaults to no ACL.

#### compress
If true, the files will be gzipped before uploading (may reduce s3 storage costs).
Defaults to false.

### License
[ISC](http://opensource.org/licenses/ISC): equivalent to 2-clause BSD.

