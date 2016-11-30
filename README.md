# gelf-http
Node module to send Graylog Information via HTTP. Because sometimes that's all you need.

# configuration

	{
		url: "http://localhost:8082/gelf", // URL to the Graylog Node
		gzip : false // Set to true if you want to save some bandwidth.
	}

# Functions

## `init(configuration)`

Initialzes the module with the given configuration

	var gl2 = require("gelf-http");
	gl2.init({
		url: 'http://localhost:8082/gelf',
		gzip: true
	});

gelf-http supports both HTTP and HTTPS, depending on the protocol defined in the URL

	
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
 

## Examples

    var gl2 = require('gelf-http');

    /* Graylog will receive a basic message with "This is a debug line" as message */
    gl2.debug("This is a debug line");

    /* Graylog will receive a message with variables : 
        {
            _cpu_load : 0.509439832,
            _ram_load : 0.2984398,
            _db_connections :298
        }
    */
    gl2.info({
        "cpu_load":0.509439832,
        "ram_load":0.2984398,
        "db_connections":298
    });