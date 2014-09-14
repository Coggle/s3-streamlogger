## s3-streamlogger

A Writable Stream object that uploads to s3 objects, periodically rotating to a
new object name.

### Installation
```bash
npm install --save s3-streamlogger
```

### Basic Usage
```js
var S3StreamLogger = require('s3-streamlogger').S3StreamLogger;

var s3stream = new S3SteamLogger({
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

var s3_stream = new S3SteamLogger({
             bucket: "mys3bucket",
      access_key_id: "...",
  secret_access_key: "..."
});

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({
      stream: s3_stream
    })
  ]
});

logger.info('Hello Winston!');
```

### Handling logging errors
When there is an error writing to s3, the stream emits an 'error' event with
details. You should take care **not** to log these errors back to the same
stream (as that is likely to cause infinite recursion). Instead log them to the
console, to a file, or to SNS using [winston-sns](https://github.com/jesseditson/winston-sns).


### Options

#### bucket *(required)*
Name of the S3 bucket to upload data to. Must exist.
Can also be provided as the environment variable `BUCKET_NAME`.

#### access_key_id *(required)*
AWS access key ID, must have putObject permission on the specified bucket.
Can also be provided as the environment variable `AWS_SECRET_ACCESS_KEY`.

#### secret_access_key *(required)*
AWS secret key for the `access_key_id` specified.
Can also be provided as the environment variable `AWS_SECRET_KEY_ID`.

#### name_format
Format of file names to create, accepts [strftime specifiers](https://github.com/samsonjs/strftime). Defaults to `"%Y-%m-%d-%H-%M.log"`.

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


### License
[ISC](http://opensource.org/licenses/ISC): equivalent to 2-clause BSD.

