'use strict';

const MarkerTest = require('./marker_test');

class NoLocationOkTest extends MarkerTest {

	get description () {
		return 'should accept the item and return it when no location is given with a marker';
	}

	// form the data to use in trying to create the item
	makeItemData (callback) {
		// completely remove the location, this is permitted
		super.makeItemData(() => {
			delete this.data.markers[0].location;
			callback();
		});
	}
}

module.exports = NoLocationOkTest;
