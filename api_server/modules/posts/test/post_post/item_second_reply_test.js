'use strict';

const PostReplyTest = require('./post_reply_test');
const BoundAsync = require(process.env.CS_API_TOP + '/server_utils/bound_async');
const Assert = require('assert');

class ItemSecondReplyTest extends PostReplyTest {

	get description () {
		return 'parent post should get numReplies incremented when a second reply is created for that post';
	}

	setTestOptions (callback) {
		super.setTestOptions(() => {
			this.postOptions.wantItem = true;
			callback();
		});
	}

	// run the test...
	run (callback) {
		BoundAsync.series(this, [
			super.run,	// this posts the reply and checks the result, but then...
			this.createSecondReply,	// create another reply
			this.checkItem	// ...we'll check the item 
		], callback);
	}

	// create a second repy, to test that numReplies gets incremented even if hasReplies is set
	createSecondReply (callback) {
		this.postFactory.createRandomPost(
			callback,
			{
				streamId: this.stream._id,
				token: this.users[1].accessToken,
				parentPostId: this.postData[0].post._id
			}
		);
	}

	// check the item associated with the parent post
	checkItem (callback) {
		this.doApiRequest(
			{
				method: 'get',
				path: '/items/' + this.postData[0].item._id,
				token: this.token
			},
			(error, response) => {
				if (error) { return callback(error); }
				// confirm the numReplies attribute has been incremented ... again
				Assert.equal(response.item.numReplies, 2, 'numReplies should be 2');
				callback();
			}
		);
	}
}

module.exports = ItemSecondReplyTest;
