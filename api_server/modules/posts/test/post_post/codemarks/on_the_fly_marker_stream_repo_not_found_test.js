'use strict';

const MarkerStreamOnTheFlyTest = require('./marker_stream_on_the_fly_test');
const ObjectId = require('mongodb').ObjectId;

class OnTheFlyMarkerStreamRepoNotFoundTest extends MarkerStreamOnTheFlyTest {

	get description () {
		return 'should return an error when attempting to create a post and codemark with a marker with an on-the-fly stream with an invalid repo id';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1003',
			info: 'marker repo'
		};
	}

	// before the test runs...
	before (callback) {
		// for the stream we want to create on-the-fly, substitute an ID for a non-existent repo
		super.before(error => {
			if (error) { return callback(error); }
			this.data.codemark.markers[0].repoId = ObjectId();
			callback();
		});
	}
}

module.exports = OnTheFlyMarkerStreamRepoNotFoundTest;
