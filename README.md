# gelf-http
Node module to send Graylog Information via HTTP. Because sometimes that's all you need.

# configuration

	{
		url: "http://localhost:8082/gelf", // URL to the Graylog Node
		gzip : false // Set to true if you want to save some bandwidth.
	}

# Functions

## `init(url[,defaultMessage])`

Initialzes the module with the given configuration

	var gl2 = require("gelf-http");
	gl2.init('http://localhost:8082/gelf');

Parameters

- (`string` or `instanceof require('url')`) `url` : URL of the HTTP Input on your Graylog server. `gelf-http` supports both HTTP and HTTPS
- (`object`) `defaultMessage` : default object that will be used as a base message for all the messages sent. Useful if you want to provide some fields with all your messages. Will be merged with the `message` parameter of `send()`.

	
## `send(message, level [, callback])`

Sends a message to the Graylog Server.
- `message` : Either a string or a object. If an object is given, it will be flattened to be correctly analyzed by Graylog. 
- `level` : from 0 (panic) to 7 (debug), as described in the GELF specifications.
- `callback` : optional `function(err, (boolean) success)` fired on the result of the HTTP request.

### Shorthands functions to send()

So you don't need to remember which level is which number :)
- `debug(message [, callback])`
- `info(message [, callback])`
- `notice(message [, callback])`
- `warn(message [, callback])`
- `error(message [, callback])`
- `critical(message [, callback])`
- `alert(message [, callback])`
- `panic(message [, callback])`

### Metrics

`gelf-http` also provides two functions specifically used for sending metrics to Graylog.

- `metric(name, value[, callback])`
- `metrics(values[, callback])`

## Examples

```js
let gl2 = require('gelf-http');

gl2.init('http://localhost:8082/gelf');

/* Graylog will receive a basic DEBUG message with "This is a debug line" as message */
gl2.debug("This is a debug line");

/* Graylog will receive a INFO message with variables : 
    {
        "_cpu_load" : 0.509439832,
        "_ram_load" : 0.2984398,
        "_db_connections" :298
    }
*/
gl2.info({
    "cpu_load":0.509439832,
    "ram_load":0.2984398,
    "db_connections":298
});

/* Graylog will receive a INFO message with the following payload : 
    {
        "_label" : "cpu_load",
        "_value" : 50
    }
*/
gl2.metric("cpu_load",50);

```
## Contribute 

// TODO

## Run unit tests

### Basic tests with only a mock server

```bash
$ npm install
$ mocha test
```

### You have a real Graylog server with an HTTP input? Test the module with it too!

```bash
$ npm install
$ env GELF_HTTP_SERVER="url_of_your_http_input"
$ mocha test
```