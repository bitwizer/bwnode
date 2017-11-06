const Fs = require('fs');
const Path = require('path');
const license = '// Copyright 2012-2017 (c) Bitwize <https://bitwize.com.lb>\n\n';
var output;

// COMPRESSION
if (process.argv.indexOf('--minify') !== -1) {
	var options = {};
	options.mangle = true;
	options.output = { quote_style: 1 };
	var U = require('uglify-es');
	output = Fs.readFileSync(Path.join(process.cwd(), 'bwnode')).toString('utf8');
	output = U.minify(output, options);
	Fs.writeFileSync(Path.join(process.cwd(), 'bwnode'), license + output.code);
	return;
}

// MERGING
var merge = ['builders.js', 'utils.js', 'image.js', 'mail.js', 'internal.js', 'nosql.js', 'index.js', 'cluster.js', 'debug.js'];
var buffer = [];

for (var i = 0, length = merge.length; i < length; i++) {

	var file = merge[i];
	var content = Fs.readFileSync('../' + file).toString('utf8');

	content = content.replace('!global.framework && require(\'./index\');', '');

	switch (file) {
		case 'index.js':
			buffer.push(content);
			break;
		default:
			buffer.push('(function(module){var exports=module.exports;global.framework_' + file.substring(0, file.length - 3) + '=module.exports;\n' + content + 'return module;})({exports:{}});');
			break;
	}
}

output = buffer.join('');
console.log('---->', output.length / 1024 >> 0, 'kB');
Fs.writeFileSync(Path.join(process.cwd(), 'bwnode'), output);
