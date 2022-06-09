'use strict';

const CodeErrorReplyTest = require('./code_error_reply_test');
const BoundAsync = require(process.env.CSSVC_BACKEND_ROOT + '/shared/server_utils/bound_async');
const Assert = require('assert');

class CodeErrorNumRepliesTest extends CodeErrorReplyTest {

	get description () {
		return 'parent post\'s code error should get its numReplies attribute incremented when a reply is created for a post with a code error';
	}

	// run the test...
	run (callback) {
		BoundAsync.series(this, [
			super.run,	// this posts the reply and checks the result, but then...
			this.checkCodeError	// ...we'll check the code error
		], callback);
	}

	validateResponse (data) {
		const now = Date.now();
		const expectedCodeErrors = [{
			id: this.postData[0].codeError.id,
			_id: this.postData[0].codeError._id, // DEPRECATE ME
			$set: {
				numReplies: 1,
				version: 2
			},
			$addToSet: {
				followerIds: [
					this.currentUser.user.id
				]
			},
			$version: {
				before: 1,
				after: 2
			}
		}];
		['modifiedAt', 'lastActivityAt', 'lastReplyAt'].forEach(attribute => {
			Assert(data.codeErrors[0].$set[attribute] >= this.postCreatedAfter, `${attribute} not set to after post was created`);
			expectedCodeErrors[0].$set[attribute] = data.codeErrors[0].$set[attribute];
		});
		Assert.deepStrictEqual(data.codeErrors, expectedCodeErrors, 'updated code errors are not correct');
		super.validateResponse(data);
	}

	// check the code error associated with the parent post
	checkCodeError (callback) {
		// get the code error
		this.doApiRequest(
			{
				method: 'get',
				path: '/code-errors/' + this.postData[0].codeError.id,
				token: this.token
			},
			(error, response) => {
				if (error) { return callback(error); }
				// confirm the numReplies attribute has been incremented
				Assert.equal(response.codeError.numReplies, 1, 'numReplies should be 1');
				callback();
			}
		);
	}
}

module.exports = CodeErrorNumRepliesTest;
