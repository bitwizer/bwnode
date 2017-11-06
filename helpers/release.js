const options = {};

// options.ip = '127.0.0.1';
// options.port = parseInt(process.argv[2]);
// options.config = { name: 'BWNode.js' };
// options.sleep = 3000;

require('bwnode.js').http('release', options);
// require('bwnode.js').cluster.http(5, 'release', options);
