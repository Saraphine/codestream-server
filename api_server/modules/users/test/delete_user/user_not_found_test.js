'use strict';

const DeleteUserTest = require('./delete_user_test');
const ObjectId = require('mongodb').ObjectId;

class UserNotFoundTest extends DeleteUserTest {

	get description () {
		return 'should return an error when trying to delete a user that doesn\'t exist';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1003',
			info: 'user'
		};
	}

	// before the test runs...
	before (callback) {
		super.before(error => {
			if (error) { return callback(error); }
			this.path = '/users/' + ObjectId(); // substitute an ID for a non-existent user
			callback();
		});
	}
}

module.exports = UserNotFoundTest;
