'use strict';

const Aggregation = require(process.env.CS_API_TOP + '/server_utils/aggregation');
const MarkerTest = require('./marker_test');
const CommonInit = require('./common_init');
const CodeStreamMessageTest = require(process.env.CS_API_TOP + '/modules/messager/test/codestream_message_test');

class NewRepoMessageToTeamTest extends Aggregation(CodeStreamMessageTest, CommonInit, MarkerTest) {

	get description () {
		return 'members of the team should receive a message with the repo when an codemark is posted to a private stream with a marker from a file stream created on the fly where the repo is also created on the fly';
	}

	// make the data that triggers the message to be received
	makeData (callback) {
		this.init(callback);
	}

	// set the name of the channel we expect to receive a message on
	setChannelName (callback) {
		// it is the team channel
		this.channelName = `team-${this.team._id}`;
		callback();
	}

	makeCodemarkData (callback) {
		super.makeCodemarkData (() => {
			// add marker data to the codemark
			this.data.markers = this.markerFactory.createRandomMarkers(1, { withRandomStream: true });
			callback();
		});
	}

	// generate the message by issuing a request
	generateMessage (callback) {
		this.doApiRequest(
			{
				method: 'post',
				path: '/codemarks',
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
