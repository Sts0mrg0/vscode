/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

var download = require('../lib/download');
var path = require('path');
var fs = require('fs');
var plist = require('fast-plist');
var cson = require('cson-parser');

function getCommitSha(repoId, repoPath) {
	var commitInfo = 'https://api.github.com/repos/' + repoId + '/commits?path=' + repoPath;
	return download.toString(commitInfo).then(function (content) {
		try {
			let lastCommit = JSON.parse(content)[0];
			return Promise.resolve({
				commitSha : lastCommit.sha,
				commitDate : lastCommit.commit.author.date
			});
		} catch (e) {
			return Promise.resolve(null);
		}
	}, function () {
		console.err('Failed loading ' + commitInfo);
		return Promise.resolve(null);
	});
}

exports.update = function (repoId, repoPath, dest, modifyGrammar) {
	var contentPath = 'https://raw.githubusercontent.com/' + repoId + '/master/' + repoPath;
	console.log('Reading from ' + contentPath);
	return download.toString(contentPath).then(function (content) {
		var ext = path.extname(repoPath);
		var grammar;
		if (ext === '.tmLanguage' || ext === '.plist') {
			grammar = plist.parse(content);
		} else if (ext === '.cson') {
			grammar = cson.parse(content);
		} else if (ext === '.json') {
			grammar = JSON.parse(content);
		} else {
			console.error('Unknown file extension: ' + ext);
			return;
		}
		if (modifyGrammar) {
			modifyGrammar(grammar);
		}
		return getCommitSha(repoId, repoPath).then(function (info) {
			if (info) {
				grammar.version = 'https://github.com/' + repoId + '/commit/' + info.commitSha;
			}
			try {
				fs.writeFileSync(dest, JSON.stringify(grammar, null, '\t'));
				if (info) {
					console.log('Updated ' + path.basename(dest) + ' to ' + repoId + '@' + info.commitSha.substr(0, 7) + ' (' + info.commitDate.substr(0, 10) + ')');
				} else {
					console.log('Updated ' + path.basename(dest));
				}
			} catch (e) {
				console.error(e);
			}
		});

	}, console.error);
}
if (path.basename(process.argv[1]) === 'update-grammar.js') {
	for (var i = 3; i < process.argv.length; i+=2) {
		exports.update(process.argv[2], process.argv[i], process.argv[i+1]);
	}
}



