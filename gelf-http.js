const https = require('https');
const http = require('http');

const defaultConfiguration = {
	'url': 'http://localhost:8000/gelf',
	'defaultMessage':{}
};
const defaultMessage = {
	'version': '1.1',
	'host': require('os').hostname(),
	'short_message':'',
	'full_message':'',
	'timestamp': 0,
	'level':1
};

let transporter = null;
let configuration = {};

const SendMessage = function(message, level, callback){
	if(transporter === null){
		throw new Error('init() must be called first to initialize transporter');
	}
	let options = Object.assign(configuration.url, {method: 'POST',headers:{'Content-Type':'application/json'}}); 
	let request = transporter.request(options);

	if(callback === undefined){
		callback = function(err, res){};
	}

	request.on('error', function (error) {
		callback(error, false);   
	});
	request.on('response', function(response){
		let rawResponse = '';
		response.on('data', function(chunk){ rawResponse += chunk; });
		response.on('end', function(){
			switch(response.statusCode){
				case 202:
					return callback(null,true);
				default:
					return callback(new Error(response.statusCode + " - " + rawResponse),false);
			}
		});
	});

	let payload = Object.assign({},defaultMessage,configuration.defaultMessage);
	payload.timestamp = Date.now() / 1000;

	if(typeof message === 'string'){
		payload.short_message = message;
	}
	else{
		payload = Object.assign(payload,FlattenObject(message));
	}

	if(level !== undefined && typeof level === 'number'){
		payload.level = level;
	}
	else{
		throw new TypeError('level must be an integer');
	}

	let payloadString = JSON.stringify(payload);
	request.end(payloadString);
};

const FlattenObject = function(self, prefix, separator, parent) {
	if(prefix === undefined)
		prefix = "_";
	if(separator === undefined)
		separator = "_";

	if(self === undefined){
		throw new ReferenceError("self parameter is mandatory");
	}
	if(typeof self !== 'object')
		throw new TypeError("First parameter should be an object, not " + self);

	let newObject = {};

	for(var key in self){
		let newKey = (key.charAt(0) === prefix ? key : (prefix + key));
		if(typeof self[key] === 'object'){
			newObject = Object.assign(newObject, FlattenObject(self[key],newKey+separator));
		}
		else if(prefix === separator && ['version','host','short_message'].indexOf(key)>-1){
			newObject[key] = self[key];
		}
		else{
			newObject[newKey] = self[key];
		}
	}
	
	return newObject;
};

exports.init = function(url, defaultMessage){
	if(url === undefined){
		throw new TypeError("url argument is mandatory");
	}
	if(defaultMessage !== undefined && defaultMessage.version !== undefined){
		throw new Error("version field cannot be overriden");
	}


	if(typeof url === 'string'){
		url = require('url').parse(url);
	}

	if(url.protocol === null || ['http:','https:'].indexOf(url.protocol) == -1 || url.host === null){
		throw new URIError("URL is not valid");
	}

	configuration.url = url;
	if(defaultMessage !== undefined){
		configuration.defaultMessage = defaultMessage;
	}

	transporter = (configuration.url.protocol === 'https:' ? https : http);
};

exports.debug = function(_message, _callback){
	SendMessage(_message,7,_callback);
};
exports.info = function(_message, _callback){
	SendMessage(_message,6,_callback);
};
exports.notice = function(_message, _callback){
	SendMessage(_message,5,_callback);
};
exports.warn = function(_message, _callback){
	SendMessage(_message,4,_callback);
};
exports.error = function(_message, _callback){
	SendMessage(_message,3,_callback);
};
exports.critical = function(_message, _callback){
	SendMessage(_message,2,_callback);	
};
exports.alert = function(_message, _callback){
	SendMessage(_message,1,_callback);	
};
exports.panic = function(_message, _callback){
	SendMessage(_message,0,_callback);	
};
exports.metric = function(_label, _value, _callback){
	if(typeof _value !== 'number'){
		console.warn('Value is not a number. Charting will be impossible', _value);
	}

	SendMessage({'short_message': 'metric', '_label':_label, '_value': _value},6,_callback);
};
exports.metrics = function(category, values, _callback){
	let payload = {
		"short_message" : 'metrics_'+ category
	};
	payload[category] = values;

	SendMessage(payload,6,_callback);
};

exports.send = SendMessage;
exports.flatten = FlattenObject;

