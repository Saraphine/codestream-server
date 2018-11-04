'use strict';

const GetItemsTest = require('./get_items_test');
const BoundAsync = require(process.env.CS_API_TOP + '/server_utils/bound_async');
const RandomString = require('randomstring');

class GetPostlessItemsTest extends GetItemsTest {

	constructor (options) {
		super(options);
		delete this.streamOptions.creatorIndex;
		delete this.postOptions.creatorIndex;
	}

	get description () {
		return 'should return the correct items when requesting items for a team and the items are for third-party provider';
	}

	// before the test runs...
	before (callback) {
		BoundAsync.series(this, [
			super.before,
			this.createItems,
			this.setItems,
			this.setPath
		], callback);
	}

	createItems (callback) {
		this.postData = [];
		BoundAsync.timesSeries(
			this,
			10,
			this.createItem,
			callback
		);
	}

	createItem (n, callback) {
		const type = this.postOptions.itemTypes[this.postOptions.assignedTypes[n]];
		const itemData = this.itemFactory.getRandomItemData({ itemType: type });
		Object.assign(itemData, {
			teamId: this.team._id,
			providerType: RandomString.generate(8),
			streamId: RandomString.generate(10),
			postId: RandomString.generate(10)
		});
		if (this.wantMarker) {
			itemData.markers = this.markerFactory.createRandomMarkers(1, { fileStreamId: this.repoStreams[0]._id });
		}
		this.doApiRequest(
			{
				method: 'post',
				path: '/items',
				data: itemData,
				token: this.users[1].accessToken
			},
			(error, response) => {
				if (error) { return callback(error); }
				this.postData.push({ item: response.item });
				callback();
			}
		);
	}
}

module.exports = GetPostlessItemsTest;
