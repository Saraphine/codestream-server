'use strict';

const MarkerTest = require('./marker_test');

class NoCommitHashTest extends MarkerTest {

	constructor (options) {
		super(options);
		this.dontExpectCommitHash = true;
		this.dontExpectFile = true;
		this.dontExpectRepo = true;
		this.dontExpectFileStreamId = true;
		this.dontExpectRepoId = true;
	}

	get description () {
		return 'should be ok to create an item with a marker but not providing a commit hash as long as there is also no stream';
	}

	// form the data to use in trying to create the item
	makeItemData (callback) {
		// remove the commit hash from the data to use in creating the item
		// also remove the stream ID, making the statement that we are not associating the marker with a stream at all
		super.makeItemData(() => {
			const marker = this.data.markers[0];
			delete marker.commitHash;
			delete marker.fileStreamId;	
			callback();
		});
	}
}

module.exports = NoCommitHashTest;
