'use strict';

const UnfollowTest = require('./unfollow_test');
const Assert = require('assert');

class InvalidTokenTest extends UnfollowTest {

	get description () {
		return 'should redirect to an error page when trying to unfollow a code error by clicking an email link, providing an invalid token';
	}

	// before the test runs...
	before (callback) {
		super.before(error => {
			if (error) { return callback(error); }
			// change path to include an invalid token
			this.path = `/no-auth/unfollow-link/code-error/${this.codeError.id}?t=x`;
			callback();
		});
	}

	validateResponse (data) {
		Assert.equal(data, '/web/unfollow-code-error-error?error=AUTH-1002', 'improper redirect');
	}
}

module.exports = InvalidTokenTest;
