'use strict';

const Assert = require('assert');
const CodeStreamMessageTest = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/modules/broadcaster/test/codestream_message_test');
const TokenHandler = require(process.env.CSSVC_BACKEND_ROOT + '/shared/server_utils/token_handler');

class ConfirmationEmailTest extends CodeStreamMessageTest {

	constructor (options) {
		super(options);
		this.messageReceiveTimeout = 10000;	// wait 10 seconds for message
		this.userOptions.numRegistered = 1;
		delete this.teamOptions.creatorIndex;
	}

	get description () {
		return 'should send a confirmation email when a new user sends a change-email request';
	}

	// make the data that will be used during the test
	makeData (callback) {
		this.data = {
			email: this.userFactory.randomEmail()
		};
		this.data._delayEmail = this.usingSocketCluster ? 1000 : (this.mockMode ? 200 : 5000);	// delay the sending of the email, so we can start subscribing to the me-channel before the email is sent
		callback();
	}

	// set the channel name to listen for the email message on
	setChannelName (callback) {
		// for the user we expect to receive the confirmation email, we use their me-channel
		// we'll be sending the data that we would otherwise send to the outbound email
		// service on this channel, and then we'll validate the data
		this.channelName = `user-${this.currentUser.user.id}`;
		callback();
	}

	// generate the message that starts the test
	generateMessage (callback) {
		// this is the message we expect to see
		this.message = {
			type: 'changeEmail',
			userId: this.currentUser.user.id,
			email: this.data.email,
			fromSupport: true,
			traceHeaders: {}
		};
		// send the request to initiate chaning email
		this.doApiRequest(
			{
				method: 'put',
				path: '/change-email',
				data: this.data,
				testEmails: true,	// this should get us email data back in the pubnub me-channel
				token: this.token
			},
			callback
		);
	}

	// validate the message received from pubnub
	validateMessage (message) {
		const gotMessage = message.message;

		// verify a match to the url
		const host = this.apiConfig.apiServer.publicApiUrl.replace(/\//g, '\\/');
		const shouldMatch = new RegExp(`^${host}\\/web\\/confirm-email\\?t=(.+)$`);
		const match = gotMessage.url.match(shouldMatch);
		Assert(match && match.length === 2, 'confirmation link url is not correct');

		// verify correct payload
		const token = match[1];
		const payload = new TokenHandler(this.apiConfig.sharedSecrets.auth).verify(token);
		Assert.equal(payload.iss, 'CodeStream', 'token payload issuer is not CodeStream');
		Assert.equal(payload.alg, 'HS256', 'token payload algortihm is not HS256');
		Assert.equal(payload.type, 'email', 'token payload type should be conf');
		Assert.equal(payload.uid, this.currentUser.user.id, 'uid in token payload is incorrect');
		Assert(payload.iat <= Math.floor(Date.now() / 1000), 'iat in token payload is not earlier than now');
		Assert.equal(payload.exp, payload.iat + 86400, 'token payload expiration is not one day out');

		// allow to pass deepEqual
		this.message.url = gotMessage.url;
		return super.validateMessage(message);
	}
}

module.exports = ConfirmationEmailTest;
