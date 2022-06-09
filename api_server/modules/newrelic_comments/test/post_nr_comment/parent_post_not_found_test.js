'use strict';

const NestedCommentTest = require('./nested_comment_test');
const ObjectId = require('mongodb').ObjectId;

class ParentPostNotFoundTest extends NestedCommentTest {

	get description () {
		return 'should return an error when trying to reply to an NR comment that does not exist';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1003',
			info: 'parent post'
		};
	}

	setParentPost (callback) {
		super.setParentPost(error => {
			if (error) { return callback(error); }
			this.data.parentPostId = ObjectId();
			callback();
		});
	}
}

module.exports = ParentPostNotFoundTest;
