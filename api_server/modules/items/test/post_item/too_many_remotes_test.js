'use strict';

const MarkerTest = require('./marker_test');

class TooManyRemotesTest extends MarkerTest {

	get description () {
		return 'should return an error when attempting to create an item with a marker element where the remotes array has too many elements';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1005',
			info: 'too many remotes'
		};
	}

	// form the data to use in trying to create the item
	makeItemData (callback) {
		// set the "remotes" field to an array of 101 elements
		super.makeItemData(() => {
			this.data.markers[0].remotes = new Array(101).fill('x');
			callback();
		});
	}
}

module.exports = TooManyRemotesTest;
