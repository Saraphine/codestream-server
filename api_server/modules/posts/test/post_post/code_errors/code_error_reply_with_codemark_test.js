'use strict';

const CodeErrorReplyTest = require('./code_error_reply_test');
const CodemarkValidator = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/modules/codemarks/test/codemark_validator');

class CodeErrorReplyWithCodemarkTest extends CodeErrorReplyTest {

	get description () {
		return 'should be ok to reply to a code error with a codemark';
	}

	setTestOptions (callback) {
		super.setTestOptions(() => {
			this.repoOptions.creatorIndex = 1;
			callback();
		});
	}

	makePostData (callback) {
		super.makePostData(() => {
			this.data.codemark = this.codemarkFactory.getRandomCodemarkData({ wantMarkers: 2, fileStreamId: this.repoStreams[0].id});
			this.data.teamId = this.team.id;
			this.expectStreamMarkers = 2;
			this.expectMarkers = 2;
			this.streamUpdatesOk = true;
			callback();
		})
	}

	validateResponse (data) {
		this.expectedFollowerIds = [this.users[1].user.id, this.currentUser.user.id];
		const inputCodemark = Object.assign(this.data.codemark, {
			streamId: this.postData[0].codeError.streamId,
			postId: data.post.id
		});
		new CodemarkValidator({
			test: this,
			inputCodemark,
			usingCodeStreamChannels: true
		}).validateCodemark(data);

		super.validateResponse(data);
	}
}

module.exports = CodeErrorReplyWithCodemarkTest;
