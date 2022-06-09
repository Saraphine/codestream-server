'use strict';

const Assert = require('assert');
const CodeStreamAPITest = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/lib/test_base/codestream_api_test');

class LastReadsNoneForObjectStreamTest extends CodeStreamAPITest {

	constructor (options) {
		super(options);
		Object.assign(this.postOptions, {
			creatorIndex: 1,
			numPosts: 4,
			postData: [
				{
					wantCodeError: true
				},
				{
					replyTo: 0
				},
				{
					replyTo: 0
				},
				{
					replyTo: 0
				}
			]
		});
	}

	get description () {
		const type = this.type || 'team';
		return `last read attribute for team members should get updated to "0" when a new post is created in an object stream and those members have not read any posts in the stream yet`;
	}

	get method () {
		return 'get';
	}

	get path () {
		// the test is to check the lastReads attribute for the stream, which we
		// get when we fetch the user's own user object
		return '/users/me';
	}

	getExpectedFields () {
		return { user: ['lastReads'] };
	}

	// validate the response to the request
	validateResponse (data) {
		// we fetched the user's "user" object, we should see their lastReads attribute
		// for the created stream set to 0, meaning they haven't read any messages in that
		// stream
		Assert(data.user.lastReads[this.postData[0].codeError.streamId] === 0, 'lastReads for object stream is not 0');
	}
}

module.exports = LastReadsNoneForObjectStreamTest;
