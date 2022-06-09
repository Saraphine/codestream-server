'use strict';

const GrantTest = require('./grant_test');
const ObjectId = require('mongodb').ObjectId;

class NonTeamChannelACLTest extends GrantTest {

	getExpectedError () {
		return {
			code: 'RAPI-1009'
		};
	}

	get description () {
		return 'should return an error when requesting to grant access to the team channel for a non-existent team';
	}

	// set the path to use when issuing the test request
	setPath (callback) {
		// set to grant access to the channel for a non-existent team
		this.path = '/grant/team-' + ObjectId();
		callback();
	}
}

module.exports = NonTeamChannelACLTest;
