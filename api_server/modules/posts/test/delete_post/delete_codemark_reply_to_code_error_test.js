'use strict';

const DeletePostTest = require('./delete_post_test');
const Assert = require('assert');
const PostTestConstants = require('../post_test_constants');
const CodeErrorTestConstants = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/modules/code_errors/test/code_error_test_constants');

class DeleteCodemarkReplyToCodeErrorTest extends DeletePostTest {

	get description () {
		return 'should delete associated codemark as a reply to a code error when requested';
	}

	setTestOptions (callback) {
		this.testPost = 2;
		super.setTestOptions(() => {
			this.repoOptions.creatorIndex = 1;
			Object.assign(this.postOptions, {
				numPosts: 4,
				postData: [{
					wantCodeError: true
				}, {
					replyTo: 0
				}, {
					replyTo: 0,
					wantCodemark: true,
					wantMarkers: 2
				}, {
					replyTo: 0
				}]
			});
			callback();
		});
	}

	setExpectedData (callback) {
		const codeErrorPost = this.postData[0];
		const testPost = this.postData[this.testPost];
		super.setExpectedData(() => {
			this.expectedData.codeErrors = [{
				_id: codeErrorPost.codeError.id, // DEPRECATE ME
				id: codeErrorPost.codeError.id, 
				$set: {
					modifiedAt: Date.now(), // placeholder
					numReplies: 2,
					version: 5
				},
				$version: {
					after: 5,
					before: 4
				}
			}];
			this.expectedData.codemarks = [{
				_id: testPost.codemark.id,	// DEPRECATE ME
				id: testPost.codemark.id,
				$set: {
					deactivated: true,
					modifiedAt: Date.now(),	// placeholder
					relatedCodemarkIds: [],
					version: 2
				},
				$version: {
					before: 1,
					after: 2
				}
			}];
			this.expectedData.markers = [{
				_id: testPost.markers[0].id,	// DEPRECATE ME
				id: testPost.markers[0].id,
				$set: {
					deactivated: true,
					version: 2
				},
				$version: {
					before: 1,
					after: 2
				}
			}, {
				_id: testPost.markers[1].id,	// DEPRECATE ME
				id: testPost.markers[1].id,
				$set: {
					deactivated: true,
					version: 2
				},
				$version: {
					before: 1,
					after: 2
				}
			}];
			this.expectedData.posts.push({
				_id: codeErrorPost.post.id, // DEPRECATE ME
				id: codeErrorPost.post.id, 
				$set: {
					modifiedAt: Date.now(), // placeholder
					numReplies: 2,
					version: 5
				},
				$version: {
					after: 5,
					before: 4
				}
			});
			this.expectedData.markers.sort((a, b) => {
				return a.id.localeCompare(b.id);
			});
			this.expectedData.posts.sort((a, b) => {
				return a.id.localeCompare(b.id);
			});
			callback();
		});
	}

	validateResponse (data) {
		data.posts.sort((a, b) => {
			return a.id.localeCompare(b.id);
		});
		data.markers.sort((a, b) => {
			return a.id.localeCompare(b.id);
		});
		const codeError = data.codeErrors[0];
		Assert(codeError.$set.modifiedAt >= this.modifiedAfter, 'codeError modifiedAt is not greater than before the post was deleted');
		this.expectedData.codeErrors[0].$set.modifiedAt = codeError.$set.modifiedAt;
		const codemark = data.codemarks[0];
		Assert(codemark.$set.modifiedAt >= this.modifiedAfter, 'codeError modifiedAt is not greater than before the post was deleted');
		this.expectedData.codemarks[0].$set.modifiedAt = codemark.$set.modifiedAt;
		const parentPost = data.posts[1];
		Assert(parentPost.$set.modifiedAt >= this.modifiedAfter, 'parent post modifiedAt is not greater than before the post was deleted');
		this.expectedData.posts[1].$set.modifiedAt = parentPost.$set.modifiedAt;
		for (let i = 0; i < data.markers.length; i++) {
			const marker = data.markers[i];
			Assert(marker.$set.modifiedAt >= this.modifiedAfter, 'marker modifiedAt is not greater than before the post was deleted');
			this.expectedData.markers[i].$set.modifiedAt = marker.$set.modifiedAt;
			this.validateSanitized(marker.$set, PostTestConstants.UNSANITIZED_MARKER_ATTRIBUTES);
		}
		this.validateSanitized(codeError.$set, CodeErrorTestConstants.UNSANITIZED_ATTRIBUTES);
		this.validateSanitized(codemark.$set, PostTestConstants.UNSANITIZED_CODEMARK_ATTRIBUTES);
		this.validateSanitized(parentPost.$set, PostTestConstants.UNSANITIZED_ATTRIBUTES);
		super.validateResponse(data);
	}
}

module.exports = DeleteCodemarkReplyToCodeErrorTest;
