'use strict';

const DeleteCodemarkTest = require('./delete_codemark_test');
const ObjectId = require('mongodb').ObjectId;

class CodemarkNotFoundTest extends DeleteCodemarkTest {

	get description () {
		return 'should return an error when trying to delete a codemark that doesn\'t exist';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1003',
			info: 'codemark'
		};
	}

	// before the test runs...
	before (callback) {
		super.before(error => {
			if (error) { return callback(error); }
			this.path = '/codemarks/' + ObjectId(); // substitute an ID for a non-existent codemark
			callback();
		});
	}
}

module.exports = CodemarkNotFoundTest;
