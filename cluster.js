/**
 * @module FrameworkCluster
 * @version 1.0.0
 */

const Cluster = require('cluster');
const CLUSTER_REQ = { TYPE: 'req' };
const CLUSTER_RES = { TYPE: 'res' };
const CLUSTER_EMIT = { TYPE: 'emit' };
const FORKS = [];

var OPERATIONS = {};
var CALLBACKS = {};
var OPTIONS = {};
var THREADS = 0;

exports.emit = function(name, data) {
	if (F.isCluster) {
		CLUSTER_EMIT.name = name;
		CLUSTER_EMIT.data = data;
		process.send(CLUSTER_EMIT);
	}
	return F;
};

exports.request = function(name, data, callback, timeout) {

	if (!F.isCluster)
		return F;

	if (typeof(data) === 'function') {
		timeout = callback;
		callback = data;
		data = null;
	}

	CLUSTER_REQ.name = name;
	CLUSTER_REQ.data = data;
	CLUSTER_REQ.callback = (Math.random()).toString(32).substring(3);
	var obj = CALLBACKS[CLUSTER_REQ.callback] = { fn: callback, response: [], id: CLUSTER_REQ.callback };

	obj.timeout = setTimeout(function(obj) {
		delete CALLBACKS[obj.id];
		obj.fn && obj.fn(new Error('Timeout.'), obj.response);
	}, timeout || 3000, obj);

	process.send(CLUSTER_REQ);
	return F;
};

exports.response = function(name, callback) {
	OPERATIONS[name] = callback;
	return F;
};

exports.req = function(message) {

	if (!F.isCluster)
		return F;

	// message.id
	// message.name
	// message.data
	// message.callback

	if (OPERATIONS[message.name]) {
		OPERATIONS[message.name](message.data, function(response) {
			CLUSTER_RES.data = response;
			CLUSTER_RES.target = message.id;
			CLUSTER_RES.callback = message.callback;
			process.send(CLUSTER_RES);
		}, message.id);
	} else {
		CLUSTER_RES.target = message.id;
		CLUSTER_RES.data = undefined;
		CLUSTER_RES.callback = message.callback;
		process.send(CLUSTER_RES);
	}

	return F;
};

exports.res = function(message) {
	var callback = CALLBACKS[message.callback];
	callback.fn && callback.response.push(message.data);
	if (callback.response.length >= THREADS - 1) {
		delete CALLBACKS[callback.id];
		clearTimeout(callback.timeout);
		callback.fn && callback.fn(null, callback.response);
	}
};

exports.http = function(count, mode, options) {
	// Fork will obtain options automatically via event
	Cluster.isMaster ? master(count, mode, options) : fork();
};

exports.restart = function(index) {
	if (index === undefined) {
		for (var i = 0; i < THREADS; i++)
			exports.restart(i);
	} else {
		var fork = FORKS[index];
		if (fork) {
			fork.removeAllListeners();
			fork.disconnect();
			exec(index);
		}
	}
};

function master(count, mode, options, callback) {

	if (count == null || count === 'auto')
		count = require('os').cpus().length;

	if (!options)
		options = {};

	OPTIONS.count = count;
	OPTIONS.mode = mode;
	OPTIONS.options = options;

	var Os = require('os');
	require('./utils');

	console.log('==================== CLUSTER =======================');
	console.log('PID         : ' + process.pid);
	console.log('Node.js     : ' + process.version);
	console.log('OS          : ' + Os.platform() + ' ' + Os.release());
	console.log('Threads     : {0}x'.format(count));
	console.log('====================================================');
	console.log('Date        : ' + new Date().format('yyyy-MM-dd HH:mm:ss'));
	console.log('Mode        : ' + mode);
	console.log('====================================================\n');

	for (var i = 0; i < count; i++)
		exec(i);

	process.title = 'bwnode: cluster';
	callback && callback(FORKS);
}

function message(m) {
	for (var i = 0, length = FORKS.length; i < length; i++)
		FORKS[i] && FORKS[i].send(m);
}

function exec(index) {
	var fork = Cluster.fork();
	fork.$id = index.toString();
	fork.on('message', message);
	if (FORKS[index])
		FORKS[index] = fork;
	else
		FORKS.push(fork);
	(function(fork) {
		setTimeout(function() {
			OPTIONS.options.id = fork.$id;
			fork.send({ TYPE: 'init', id: fork.$id, mode: OPTIONS.mode, options: OPTIONS.options, threads: OPTIONS.count, index: index });
		}, fork.$id * 500);
	})(fork);
}

function fork() {
	require('./index');
	F.on('message', on_init);
}

function on_init(msg) {
	switch (msg.TYPE) {
		case 'init':
			CLUSTER_EMIT.id = msg.id;
			CLUSTER_REQ.id = msg.id;
			CLUSTER_RES.id = msg.id;
			THREADS = msg.threads;
			F.http(msg.mode, msg.options);
			F.isCluster = true;
			F.removeListener(msg.TYPE, on_init);
			break;
	}
}
