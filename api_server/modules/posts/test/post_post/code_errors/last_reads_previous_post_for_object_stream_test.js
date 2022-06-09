'use strict';

const Assert = require('assert');
const CodeStreamAPITest = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/lib/test_base/codestream_api_test');
const BoundAsync = require(process.env.CSSVC_BACKEND_ROOT + '/shared/server_utils/bound_async');

class LastReadsPreviousPostForObjectStreamTest extends CodeStreamAPITest {

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
		return 'last read attribute for members of the team should get updated to the previous post when a new post is created in an object stream, for members who are not caught up on the conversation';
	}

	// before the test runs...
	before (callback) {
		BoundAsync.series(this, [
			super.before,
			this.markRead,			// mark the previously created posts as "read"
			this.createLastPost		// create an additional post in the stream, this will be "unread"
		], callback);
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

	// mark the posts in the stream we created "read" for the current user
	markRead (callback) {
		this.doApiRequest({
			method: 'put',
			path: '/read/' + this.postData[0].codeError.streamId,
			token: this.token
		}, callback);
	}

	// create an additional post in the stream, this will go "unread"
	createLastPost (callback) {
		const postOptions = {
			streamId: this.postData[0].codeError.streamId,
			parentPostId: this.postData[0].codeError.postId,
			token: this.users[1].accessToken
		};
		this.postFactory.createRandomPost(
			(error, response) => {
				if (error) { return callback(error); }
				this.lastPost = response.post;
				callback();
			},
			postOptions
		);
	}

	// validate the response to the test request
	validateResponse (data) {
		// we fetched the user's "user" object, we should see their lastReads attribute
		// for the created stream set to the last post of the first batch we created,
		// which we marked as read for the current user
		const posts = this.postData.map(postData => postData.post);
		const lastPost = posts[posts.length - 1];
		const streamId = this.postData[0].codeError.streamId;
		Assert(data.user.lastReads[streamId] === lastPost.seqNum, 'lastReads for stream is not equal to the seqNum of the last post read');
	}
}

module.exports = LastReadsPreviousPostForObjectStreamTest;
