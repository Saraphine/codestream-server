// base class for many tests of the "PUT /join/:id" requests

'use strict';

const BoundAsync = require(process.env.CSSVC_BACKEND_ROOT + '/shared/server_utils/bound_async');
const CodeStreamAPITest = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/lib/test_base/codestream_api_test');

class CommonInit {

	init (callback) {
		BoundAsync.series(this, [
			this.setTestOptions,
			CodeStreamAPITest.prototype.before.bind(this),
			this.setExpectedData
		], callback);
	}

	setTestOptions (callback) {
		this.userOptions.numRegistered = 3;
		this.teamOptions.creatorIndex = 1;
		/*
		Object.assign(this.streamOptions, {
			creatorIndex: 1,
			members: [1, 2],
			privacy: 'public'
		});
		*/
		callback();
	}

	setExpectedData (callback) {
		this.path = '/join/' + this.teamStream.id;
		this.expectedData = {
			stream: {
				_id: this.teamStream.id,	// DEPRECATE ME
				id: this.teamStream.id,
				$addToSet: {
					memberIds: [ this.currentUser.user.id ]
				},
				$set: {
					version: 2
				},
				$version: {
					before: 1,
					after: 2
				}
			}
		};
		this.expectedStream = Object.assign({}, this.teamStream);
		/*
		if (this.stream.memberIds) {
			this.expectedStream.memberIds = [...this.stream.memberIds, this.currentUser.user.id];
			this.expectedStream.memberIds.sort();
		}
		*/
		this.expectedStream.version = 2;
		this.modifiedAfter = Date.now();
		callback();
	}

	// perform the actual joining of the stream
	// the actual test is reading the stream and verifying the user is a member
	updateStream (callback) {
		this.doApiRequest(
			{
				method: 'put',
				path: `/join/${this.teamStream.id}`,
				token: this.token
			},
			(error, response) => {
				if (error) { return callback(error); }
				this.expectedStream.modifiedAt = response.stream.$set.modifiedAt;
				this.message = response;
				callback();
			}
		);
	}
}

module.exports = CommonInit;
