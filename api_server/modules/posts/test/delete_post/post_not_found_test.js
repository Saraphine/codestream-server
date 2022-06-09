'use strict';

const DeletePostTest = require('./delete_post_test');
const ObjectId = require('mongodb').ObjectId;

class PostNotFoundTest extends DeletePostTest {

	get description () {
		return 'should return an error when trying to delete a post that doesn\'t exist';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1003',
			info: 'post'
		};
	}

	// before the test runs...
	before (callback) {
		super.before(error => {
			if (error) { return callback(error); }
			this.path = '/posts/' + ObjectId(); // substitute an ID for a non-existent post
			callback();
		});
	}
}

module.exports = PostNotFoundTest;
