'use strict';

const Aggregation = require(process.env.CS_API_TOP + '/server_utils/aggregation');
const PostToChannelTest = require('./post_to_channel_test');
const CommonInit = require('./common_init');
const CodeStreamMessageTest = require(process.env.CS_API_TOP + '/modules/messager/test/codestream_message_test');

class NewRepoMessageToTeamTest extends Aggregation(CodeStreamMessageTest, CommonInit, PostToChannelTest) {

	get description () {
		return 'members of the team should receive a message with the repo when a post and codemark are posted to a private stream with a marker from a file stream created on the fly where the repo is also created on the fly';
	}

	// make the data that triggers the message to be received
	makeData (callback) {
		this.init(callback);
	}

	makePostData (callback) {
		super.makePostData (() => {
			// add codemark and marker data to the post
			this.data.codemark = this.codemarkFactory.getRandomCodeMarkData();
			this.data.codemark.markers = this.markerFactory.createRandomMarkers(1, { withRandomStream: true });
			callback();
		});
	}

	// set the name of the channel we expect to receive a message on
	setChannelName (callback) {
		// it is the team channel
		this.channelName = `team-${this.team._id}`;
		callback();
	}

	// generate the message by issuing a request
	generateMessage (callback) {
		this.doApiRequest(
			{
				method: 'post',
				path: '/posts',
				data: this.data,
				token: this.token
			},
			(error, response) => {
				if (error) { return callback(error); }
				const repo = response.repos.find(repo => repo.createdAt);
				this.message = { repos: [repo] };
				callback();
			}
		);
	}

	validateMessage (message) {
		if (message.message.stream) { return; }
		return super.validateMessage(message);
	}
}

module.exports = NewRepoMessageToTeamTest;
