'use strict';

const ChangeEmailConfirmTest = require('./change_email_confirm_test');
const TokenHandler = require(process.env.CSSVC_BACKEND_ROOT + '/shared/server_utils/token_handler');
const ObjectId = require('mongodb').ObjectId;

class UserNotFoundTest extends ChangeEmailConfirmTest {

	get description () {
		return 'should return an error when sending a confirm change of email request with a token that has an unknown user ID';
	}

	getExpectedError () {
		return {
			code: 'AUTH-1002'
		};
	}

	// set the data to use when submitting the request
	setData (callback) {
		// replace the token with a token with a bogus user ID
		super.setData(() => {
			const tokenHandler = new TokenHandler(this.apiConfig.sharedSecrets.auth);
			const payload = tokenHandler.decode(this.data.token);
			payload.uid = ObjectId();
			this.data.token = tokenHandler.generate(payload, 'email');
			callback();
		});
	}
}

module.exports = UserNotFoundTest;
