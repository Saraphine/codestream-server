'use strict';

const RelatedCodemarksTest = require('./related_codemarks_test');
const ObjectId = require('mongodb').ObjectId;

class RelatedCodemarkNotFoundTest extends RelatedCodemarksTest {

	get description () {
		return 'should return an error when attempting to create a codemark with a related codemark that does not exist';
	}

	getExpectedError () {
		return {
			code: 'RAPI-1003',
			info: 'related codemarks'
		};
	}

	// form the data to use in trying to create the codemark
	makeCodemarkData (callback) {
		// add a non-existent codemark to the related codemarks
		super.makeCodemarkData(() => {
			this.data.relatedCodemarkIds.push(ObjectId());
			callback();
		});
	}
}

module.exports = RelatedCodemarkNotFoundTest;
