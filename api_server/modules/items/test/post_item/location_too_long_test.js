'use strict';

const MarkerTest = require('./marker_test');

class LocationTooLongTest extends MarkerTest {

	get description () {
		return 'should return an error when attempting to create an item with a marker element where the location array is too long';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1005',
			info: 'location array is too long'
		};
	}

	// form the data to use in trying to create the item
	makeItemData (callback) {
		// 6 elements in the location array ... not allowed!
		super.makeItemData(() => {
			this.data.markers[0].location = [1, 2, 3, 4, 5, 6];
			callback();
		});
	}
}

module.exports = LocationTooLongTest;
