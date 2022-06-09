// provides the base class for all tests of the "PUT /provider-auth-code" request

'use strict';

const CodeStreamAPITest = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/lib/test_base/codestream_api_test');
const TokenHandler = require(process.env.CSSVC_BACKEND_ROOT + '/shared/server_utils/token_handler');
const Assert = require('assert');

class ProviderAuthCodeTest extends CodeStreamAPITest {

	constructor (options) {
		super(options);
		this.userOptions.numRegistered = 1;
	}
	
	get description () {
		return 'should return a valid authorization code when requested';
	}

	get method () {
		return 'get';
	}

	before (callback) {
		super.before(error => {
			if (error) { return callback(error); }
			this.path = '/provider-auth-code?teamId=' + this.team._id;
			callback();
		});
	}

	// validate the response to the test request
	validateResponse (data) {
		const expiresIn = (this.expiresIn && this.expiresIn/1000) || 600;
		// verify correct payload
		const payload = new TokenHandler(this.apiConfig.sharedSecrets.auth).verify(data.code);
		Assert.equal(payload.iss, 'CodeStream', 'token payload issuer is not CodeStream');
		Assert.equal(payload.alg, 'HS256', 'token payload algortihm is not HS256');
		Assert.equal(payload.type, 'pauth', 'token payload type should be conf');
		Assert.equal(payload.userId, this.currentUser.user.id, 'userId in token payload is incorrect');
		Assert.equal(payload.teamId, this.team.id, 'teamId in token payload is incorrect');
		const nowSeconds = Math.floor(Date.now() / 1000);
		Assert(payload.iat <= nowSeconds, 'iat in token payload is not earlier than now');
		Assert.equal(payload.exp, payload.iat + expiresIn, 'token payload expiration is not correct');
	}

}

module.exports = ProviderAuthCodeTest;