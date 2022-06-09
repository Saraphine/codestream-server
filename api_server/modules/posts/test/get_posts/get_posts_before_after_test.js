'use strict';

const GetPostsTest = require('./get_posts_test');

class GetPostsBeforeAfterTest extends GetPostsTest {

	constructor (options) {
		super(options);
		this.postOptions.numPosts = 8;
	}

	get description () {
		return 'should return the correct posts when requesting posts within an ID range';
	}

	// set the path to use for the request
	setPath (callback) {
		// pick a pivot point, then filter our expected posts based on that pivot,
		// and specify the before parameter to fetch based on the pivot
		this.expectedPosts = this.postData.map(postData => postData.post);
		const lowerPivot = this.expectedPosts[2].seqNum;
		const upperPivot = this.expectedPosts[5].seqNum;
		this.expectedPosts = this.expectedPosts.filter(post => post.seqNum > lowerPivot && post.seqNum < upperPivot);
		this.path = `/posts?teamId=${this.team.id}&streamId=${this.teamStream.id}&before=${upperPivot}&after=${lowerPivot}`;
		callback();
	}
}

module.exports = GetPostsBeforeAfterTest;
