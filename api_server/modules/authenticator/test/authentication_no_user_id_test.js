'use strict';

const AuthenticationTest = require('./authentication_test');
const JSONWebToken = require('jsonwebtoken');
const SecretsConfig = require(process.env.CS_API_TOP + '/config/secrets.js');

class AuthenticationNoUserIDTest extends AuthenticationTest {

	get description () {
		return 'should prevent access to resources when no userId found in the payload of the access token';
	}

	getExpectedError () {
		return {
			code: 'AUTH-1003'
		};
	}

	// before the test runs...
	async before () {
		// remove the user ID fromt he token, then try
		await super.before();
		await this.removeUserIdFromToken();
	}

	// remove the user ID from the token
	async removeUserIdFromToken () {
		// decrypt the token to get payload
		let payload;
		const secret = SecretsConfig.auth;
		try {
			payload = JSONWebToken.verify(this.token, secret);
		}
		catch (error) {
			throw 'invalid token: ' + error;
		}
		// take the user ID out of the payload and regenerate the token
		payload.uid = payload.userId;
		delete payload.userId;
		this.token = JSONWebToken.sign(payload, secret);
	}
}

module.exports = AuthenticationNoUserIDTest;
