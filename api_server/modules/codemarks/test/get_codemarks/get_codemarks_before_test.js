'use strict';

const GetCodemarksTest = require('./get_codemarks_test');

class GetCodemarksBeforeTest extends GetCodemarksTest {

	get description () {
		return 'should return the correct codemarks when requesting codemarks in a stream before a timestamp';
	}

	// set the path to use for the request
	setPath (callback) {
		// pick a pivot point, then filter our expected codemarks based on that pivot,
		// and specify the before parameter to fetch based on the pivot
		const pivot = this.codemarks[5].createdAt;
		this.expectedCodemarks = this.codemarks.filter(codemark => codemark.createdAt < pivot);
		this.path = `/codemarks?teamId=${this.team._id}&before=${pivot}`;
		callback();
	}
}

module.exports = GetCodemarksBeforeTest;
