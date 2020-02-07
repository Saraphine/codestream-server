'use strict';

const Assert = require('assert');
const ReviewTestConstants = require('./review_test_constants');
const MarkerValidator = require(process.env.CS_API_TOP + '/modules/markers/test/marker_validator');

class ReviewValidator {

	constructor (options) {
		Object.assign(this, options);
	}

	/* eslint complexity: 0 */
	// validate the response to the test request
	validateReview (data) {
		// verify we got back an review with the attributes we specified
		const review = data.review;
		const expectedOrigin = this.expectedOrigin || '';
		let errors = [];
		let result = (
			((review.id === review._id) || errors.push('id not set to _id')) && 	// DEPRECATE ME
			((review.teamId === this.test.team.id) || errors.push('teamId does not match the team')) &&
			((review.streamId === (this.inputReview.streamId || '')) || errors.push('streamId does not match the stream')) &&
			((review.postId === (this.inputReview.postId || '')) || errors.push('postId does not match the post')) &&
			((review.deactivated === false) || errors.push('deactivated not false')) &&
			((typeof review.createdAt === 'number') || errors.push('createdAt not number')) &&
			((review.lastActivityAt === review.createdAt) || errors.push('lastActivityAt should be set to createdAt')) &&
			((review.modifiedAt >= review.createdAt) || errors.push('modifiedAt not greater than or equal to createdAt')) &&
			((review.creatorId === this.test.currentUser.user.id) || errors.push('creatorId not equal to current user id')) &&
			((review.status === this.inputReview.status) || errors.push('status does not match')) &&
			((review.text === this.inputReview.text) || errors.push('text does not match')) &&
			((review.title === this.inputReview.title) || errors.push('title does not match')) &&
			((review.numReplies === 0) || errors.push('review should have 0 replies')) &&
			((review.origin === expectedOrigin) || errors.push('origin not equal to expected origin'))
		);
		Assert(result === true && errors.length === 0, 'response not valid: ' + errors.join(', '));

		// verify the review in the response has no attributes that should not go to clients
		// in response to the POST request, we allow reviewDiffs, but it is normally not allowed to
		// be returned to the client in any other fetch
		const unsanitizedAttributes = [...ReviewTestConstants.UNSANITIZED_ATTRIBUTES];
		const index = unsanitizedAttributes.indexOf('reviewDiffs');
		unsanitizedAttributes.splice(index, 1);
		this.test.validateSanitized(review, unsanitizedAttributes);

		// if we are expecting a marker with the review, validate it
		if (this.test.expectMarkers) {
			new MarkerValidator({
				test: this.test,
				objectName: 'review',
				inputObject: this.inputReview,
				usingCodeStreamChannels: true
			}).validateMarkers(data);
		}
		else {
			Assert(typeof data.markers === 'undefined', 'markers array should not be defined');
		}
	}
}

module.exports = ReviewValidator;
