'use strict';

const Assert = require('assert');
const CodeStreamAPITest = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/lib/test_base/codestream_api_test');

class MostRecentPostForObjectStreamTest extends CodeStreamAPITest {

	constructor (options) {
		super(options);
		Object.assign(this.postOptions, {
			creatorIndex: 0,
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
		// mostRecentPostId tracks the most recent post to a stream ... for lastReads to work
		// (indicating the last read message for each user who has access to the stream),
		// mostRecentPostId must get updated every time there is a new post to the stream ...
		// sortId also tracks the most recent post, but it also is set to the ID of the stream
		// if there are no posts in it ... this is used to set an easily indexed sorting order
		// for streams, which is needed for pagination
		return 'mostRecentPostId and sortId for the object stream should get updated to the post when a reply is created in the stream';
	}

	get method () {
		// we'll be getting the stream object for the stream
		return 'get';
	}

	getExpectedFields () {
		return { stream: ['mostRecentPostId', 'mostRecentPostCreatedAt', 'sortId'] };
	}

	before (callback) {
		super.before(error => {
			if (error) { return callback(error); }
			this.path = '/streams/' + this.postData[0].codeError.streamId;
			callback();
		});
	}

	// validate the response to the test request
	validateResponse (data) {
		// validate that mostRecentPostId and sortId were both set to the ID of the
		// last post created in the stream
		const posts = this.postData.map(postData => postData.post);
		const lastPost = posts[posts.length - 1];
		Assert(data.stream.mostRecentPostId === lastPost.id, 'mostRecentPostId for stream does not match post');
		Assert(data.stream.mostRecentPostCreatedAt = lastPost.createdAt, 'mostRecentPostCreatedAt for stream does not match post');
		Assert(data.stream.sortId === lastPost.id, 'sortId for stream does not match post');
	}
}

module.exports = MostRecentPostForObjectStreamTest;
