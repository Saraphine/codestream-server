'use strict';

const GetStreamsTest = require('./get_streams_test');
const ObjectId = require('mongodb').ObjectId;

class OneRelationalTest extends GetStreamsTest {

	get description () {
		return 'should return an error if more than one relational query parameter is provided for a streams query';
	}

	// set the path to use when issuing the test request
	setPath (callback) {
		// try to fetch with both a "lt" and "gt" operator, which is forbidden 
		const id1 = ObjectId();
		const id2 = ObjectId();
		this.path = `/streams?teamId=${this.team.id}&lt=${id1}&gt=${id2}`;
		callback();
	}

	getExpectedError () {
		return {
			code: 'RAPI-1006',
			reason: 'only one relational parameter allowed'
		};
	}
}

module.exports = OneRelationalTest;
