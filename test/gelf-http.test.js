const chai = require('chai');
const expect = chai.expect;
const restify = require('restify');

const gelf = require("../gelf-http");
const gelf2 = require("../gelf-http");
const gelf3 = require("../gelf-http");

let mockGraylog = null;
let mockGraylogPort = 54321;

describe('flatten()',function(){
	it('should throw an error if not an object is given', function(){
		expect(() => gelf.flatten()).to.throw();
		expect(() => gelf.flatten(1)).to.throw(TypeError);
		expect(() => gelf.flatten("string")).to.throw(TypeError);
	});

	it('should return a empty object when passed an empty',function(){
		expect(gelf.flatten({})).to.deep.equal({});
	});

	it('should return a formatted object when given a simple object', function(){
		expect(gelf.flatten({"test": true})).to.deep.equal({"_test":true});
		expect(gelf.flatten({"test": 1})).to.deep.equal({"_test":1});
		expect(gelf.flatten({"test": "test","test2":"test2"})).to.deep.equal({"_test": "test","_test2":"test2"});
	});

	it('should not flatten mandatory parameters from GELF',function(){
		expect(gelf.flatten({'version':'1.1'})).to.be.deep.equal({'version':'1.1'});
		expect(gelf.flatten({'host':'host'})).to.be.deep.equal({'host':'host'});
		expect(gelf.flatten({'short_message':'short_message'})).to.be.deep.equal({'short_message':'short_message'});
		
		expect(gelf.flatten({'short_message':'short_message','test':true})).to.be.deep.equal({'short_message':'short_message','_test':true});
	});

	it('should merge already well formatted objects', function(){
		expect(gelf.flatten({"_test": true})).to.deep.equal({"_test":true});
	});

	it('should return a 1 dimension object when passed a multi-dimensional object', function(){
		expect(gelf.flatten({"test":{"subtest":true}})).to.deep.equal({"_test_subtest":true});
		expect(gelf.flatten({"test":[1,2,3]})).to.deep.equal({"_test_0":1,"_test_1":2,"_test_2":3});
		expect(gelf.flatten({"root":{"sub":{"sub":true}}})).to.deep.equal({"_root_sub_sub":true});
	});
});

describe('init()',function(){
	it('should throw an Error if not argument is given',function(){
		expect(() => gelf.init()).to.throw(TypeError);
	});

	it('should throw an error if the URL is not valid',function(){
		expect(() => gelf.init('invalid')).to.throw('URL');
		expect(() => gelf.init('htpp://blabla')).to.throw('URL');
	});

	it('should throw an error if the defaultMessage is used to override the version field',function(){
		expect(() => gelf.init('http://localhost',{'version':'BAD_VERSION'})).to.throw('version');
	});
});


describe('send() on the mock server', function(){

	// Create Mock Graylog server
	before(function(done){
		if(mockGraylog === null){
			mockGraylog = restify.createServer();
			mockGraylog.use(restify.plugins.bodyParser());
		}

		// Generic Handler for checking basic requirements from Graylog (parameters, methods...)
		mockGraylog.use(function(req, res, next){

			// Check method used 
			if(req.getRoute().method !== 'POST'){
				res.send(405,'Only supported method is POST');
				return next();
			}
			
			// Check mandatory fields
			if(req.body.version === undefined || req.body.version !== '1.1'){
				res.send(500,'version field is missing');
				return next();
			}
			if(req.body.host === undefined || typeof req.body.host !== 'string' || req.body.host.length === 0){
				res.send(500,'host field is missing');
				return next();
			}
			if(req.body.short_message === undefined || typeof req.body.short_message !== 'string' || req.body.host.short_message === 0 || req.body.short_message.length === 0){
				res.send(500,'short_message field is missing');
				return next();
			}

			return next();
		});

		// Simple call, waiting only a "test" message on level "1" 
		mockGraylog.post("/simple", function(req, res, next){
			if(req.body.short_message !== 'test' || req.body.level !== 1){
				res.send(400);
				return next();
			}
			res.send(202);
			return next();
		});

		// Advanced call
		mockGraylog.post("/advanced", function(req, res, next){
			if(req.body._test === undefined || req.body._test !== true){
				res.send(400);
				return next();
			}
			res.send(202);
			return next();
		});

		// Multidimensional call
		mockGraylog.post("/multi", function(req, res, next){
			if(
				req.body._root_sub_sub === true
				&& req.body.short_message === 'test'
			){
				res.send(202);
				return next();
			}
			
			res.send(400,'Not the same object');
			return next();
		});

		// Levels call
		mockGraylog.post("/level", function(req, res, next){
			if(
				req.body.level === req.body._real_level
			){
				res.send(202);
				return next();
			}
			
			res.send(400,'Levels are not the same : ' + req.body.level + ' / ' + req.body._real_level);
			return next();
		});

		
		// metric call
		mockGraylog.post("/metric", function(req, res, next){
			if(
				req.body.level === 6
				&& req.body._label === 'cpu'
				&& req.body._value === 50
			){
				res.send(202);
				return next();
			}
			
			res.send(400);
			return next();
		});

		// metrics call
		mockGraylog.post("/metrics", function(req, res, next){
			if(
				req.body.level === 6
				&& req.body.short_message === 'metrics_cpu'
				&& req.body._cpu_cores_0 === 50
				&& req.body._cpu_cores_1 === 10
				&& req.body._cpu_cores_2 === 10
				&& req.body._cpu_cores_3 === 50
				&& req.body._cpu_average === 30
			){
				res.send(202);
				return next();
			}
			
			res.send(400);
			return next();
		});

		mockGraylog.listen(mockGraylogPort,function(err){
			done(err);
		});
	});
	// Close server after tests
	after(function(done){
		mockGraylog.close(function(err){
			mockGraylog = null;
			done(err);
		});
	});

	// Actual tests
	it("should be able to send a default message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +"/simple");
		gelf2.send("test",1,done);
	});
	it("should be able to send an advanced message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/advanced');
		gelf2.send({"short_message":"test","test":true},1,done);
	});
	it("should be able to send an flattened multidimensional message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/multi');
		gelf2.send({"short_message":"test","root":{"sub":{"sub":true}}},1,done);
	});
	// LEVELS
	it("should be able to send a PANIC message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/level');
		gelf2.panic({"short_message":"test","real":{"level":0}},done);
	});
	it("should be able to send a ALERT message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/level');
		gelf2.alert({"short_message":"test","real":{"level":1}},done);
	});
	it("should be able to send a CRITICAL message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/level');
		gelf2.critical({"short_message":"test","real":{"level":2}},done);
	});
	it("should be able to send a ERROR message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/level');
		gelf2.error({"short_message":"test","real":{"level":3}},done);
	});
	it("should be able to send a WARN message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/level');
		gelf2.warn({"short_message":"test","real":{"level":4}},done);
	});
	it("should be able to send a NOTICE message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/level');
		gelf2.notice({"short_message":"test","real":{"level":5}},done);
	});
	it("should be able to send a INFO message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/level');
		gelf2.info({"short_message":"test","real":{"level":6}},done);
	});
	it("should be able to send a DEBUG message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/level');
		gelf2.debug({"short_message":"test","real":{"level":7}},done);
	});

	// METRICS
	it("should be able to send a METRIC message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/metric');
		gelf2.metric("cpu",50,done);
	});
	it("should be able to send a METRICS message", function(done){
		gelf2.init('http://localhost:' + mockGraylogPort +'/metrics');
		gelf2.metrics("cpu",{"cores":[50,10,10,50],"average":30},done);
	});
});

describe('send() on a production server', function(){
	before(function(){
		gelf3.init("");
	});

	// Actual tests
	it("should be able to send a default message", function(done){
		gelf3.send("test",1,done);
	});
	it("should be able to send an advanced message", function(done){
		gelf3.send({"short_message":"test_advanced","test":true},1,done);
	});
	it("should be able to send an flattened multidimensional message", function(done){
		gelf3.send({"short_message":"test_multi","root":{"sub":{"sub":true}}},1,done);
	});
	// LEVELS
	it("should be able to send a PANIC message", function(done){
		gelf3.panic({"short_message":"test_panic","real":{"level":0}},done);
	});
	it("should be able to send a ALERT message", function(done){
		gelf3.alert({"short_message":"test_alert","real":{"level":1}},done);
	});
	it("should be able to send a CRITICAL message", function(done){
		gelf3.critical({"short_message":"test_critical","real":{"level":2}},done);
	});
	it("should be able to send a ERROR message", function(done){
		gelf3.error({"short_message":"test_error","real":{"level":3}},done);
	});
	it("should be able to send a WARN message", function(done){
		gelf3.warn({"short_message":"test_warn","real":{"level":4}},done);
	});
	it("should be able to send a NOTICE message", function(done){
		gelf3.notice({"short_message":"test_notice","real":{"level":5}},done);
	});
	it("should be able to send a INFO message", function(done){
		gelf3.info({"short_message":"test_info","real":{"level":6}},done);
	});
	it("should be able to send a DEBUG message", function(done){
		gelf3.debug({"short_message":"test_debug","real":{"level":7}},done);
	});

	// METRICS
	it("should be able to send a METRIC message", function(done){
		gelf3.metric("cpu",50,done);
	});
	it("should be able to send a METRICS message", function(done){
		gelf3.metrics("cpu",{"cores":[50,10,10,50],"average":30},done);
	});
});