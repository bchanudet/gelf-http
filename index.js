var https = require('https');
var http = require('http');
var transporter = null;


var defaultConfig = {
	'url': 'http://localhost:8000/gelf'
};
var defaultMessage = {
	'version': '1.1',
	'host': require('os').hostname(),
	'short_message':'',
	'full_message':'',
	'timestamp': 0,
	'level':1
};

var config;

var SendMessage = function(_message, _level, _callback){

	if(transporter === null){
		throw new Error('init() must be called first to initialize transporter');
	}

	var _options = Object.assign(config.url, {method: 'POST'}); 
	var _request = transporter.request(_options);

	if(_callback === undefined){
		_callback = function(_err, _res){};
	}

	_request.on('error', function (_error) {
		_callback(_error, null);   
	});
	_request.on('response', function(_response){
		if(_response.statusCode !== 202){
			console.warn('Message not accepted', _response.responseText);
			_callback(new Error('Message not accepted'), false);
		}
		else{
			_callback(null, true);
		}
	});

	var _payload = Object.assign({},defaultMessage);

	_payload.timestamp = Date.now() / 1000;

	if(typeof _message === 'string'){
		_payload.short_message = _message;
	}
	else{
		_payload = Object.assign(_payload,_message);
	}

	if(_level !== undefined && typeof _level === 'number'){
		_payload.level = _level;
	}

	var _param = JSON.stringify(_payload);

	console.log("Sending payload", _param);
	_request.end(_param);
};

var jsonReadAllValues = function(values, data, prefix, sep) {
	if(prefix.charAt(0) !== sep){ 
		prefix = sep + prefix; 
	}

    for (var key in data) {
        var newKey = prefix + sep + key;
        if (data[key] instanceof Array || data[key] instanceof Object) {
            jsonReadAllValues(values, data[key], newKey, sep);
        }
        else {
            values[newKey] = data[key];
        }            
    }
};

exports.init = function(_config){
	config = Object.assign(defaultConfig,_config);

	if(typeof config.url === 'string'){
		config.url = require('url').parse(config.url);
	}

	if(config.url.protocol === 'https:'){
		transporter = https;
	}
	else{
		transporter = http;
	}
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

exports.metrics = function(_values, _name, _callback){
	var _additional_fields = {};
	jsonReadAllValues(_additional_fields,_values,_name,'_');

	_additional_fields.short_message = "metrics_" + _name;

	SendMessage(_additional_fields,6,_callback);
};

exports.native = SendMessage;

