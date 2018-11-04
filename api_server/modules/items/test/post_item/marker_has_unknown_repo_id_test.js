'use strict';

const MarkerTest = require('./marker_test');
const ObjectID = require('mongodb').ObjectID;

class MarkerHasUnknownRepoIdTest extends MarkerTest {

	get description () {
		return 'should return an error when attempting to create an item with a marker element where the repo ID is unknown';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1003',
			info: 'marker repo'
		};
	}

	// form the data to use in trying to create the item
	makeItemData (callback) {
		// we'll add a marker from a non-existent stream 
		super.makeItemData(() => {
			const marker = this.data.markers[0];
			delete marker.fileStreamId;
			marker.repoId = ObjectID();
			callback();
		});
	}
}

module.exports = MarkerHasUnknownRepoIdTest;
