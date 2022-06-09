'use strict';

const Aggregation = require(process.env.CSSVC_BACKEND_ROOT + '/shared/server_utils/aggregation');
const CodeStreamMessageTest = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/modules/broadcaster/test/codestream_message_test');
const CommonInit = require('./common_init');

class MessageTest extends Aggregation(CodeStreamMessageTest, CommonInit) {

	get description () {
		return 'members of the "everyone" team should receive a message with the company when a company is updated';
	}

	// make the data that triggers the message to be received
	makeData (callback) {
		this.init(callback);
	}

	// set the name of the channel we expect to receive a message on
	setChannelName (callback) {
		// expect on the "everyone" team channel
		this.channelName = `team-${this.team.id}`;

		/*
		// for channels and directs the message comes on the stream channel
		if (this.stream.type === 'file' || this.stream.isTeamStream) {
			this.channelName = `team-${this.team.id}`;
		}
		else {
			throw 'stream channels are deprecated';
			//this.channelName = `stream-${this.stream.id}`;
		}
		*/
		
		callback();
	}

	// generate the message by issuing a request
	generateMessage (callback) {
		// do the update, this should trigger a message to the
		// stream channel with the updated company
		this.updateCompany(callback);
	}
}

module.exports = MessageTest;
