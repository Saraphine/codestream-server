'use strict';

var CodeStream_Message_Test = require(process.env.CS_API_TOP + '/services/api/modules/messager/test/codestream_message_test');
var Bound_Async = require(process.env.CS_API_TOP + '/lib/util/bound_async');
var Assert = require('assert');
class New_Stream_No_Message_Test extends CodeStream_Message_Test {

	get description () {
		return `members of the team who are not members of the stream should receive no message when a post is posted to a ${this.type} stream created on the fly`;
	}

	make_data (callback) {
		Bound_Async.series(this, [
			this.create_team_creator,
			this.create_post_creator,
			this.create_repo
		], callback);
	}

	create_team_creator (callback) {
		this.user_factory.create_random_user(
			(error, response) => {
				if (error) { return callback(error);}
				this.team_creator_data = response;
				callback();
			}
		);
	}

	create_post_creator (callback) {
		this.user_factory.create_random_user(
			(error, response) => {
				if (error) { return callback(error);}
				this.post_creator_data = response;
				callback();
			}
		);
	}

	create_repo (callback) {
		this.repo_factory.create_random_repo(
			(error, response) => {
				if (error) { return callback(error); }
				this.team = response.team;
				this.repo = response.repo;
				callback();
			},
			{
				with_emails: [
					this.current_user.email,
					this.post_creator_data.user.email
				],
				with_random_emails: 1,
				token: this.team_creator_data.access_token
			}
		);
	}

	set_channel_name (callback) {
		this.channel_name = 'team-' + this.team._id;
		callback();
	}

	generate_message (callback) {
		let stream_options = {
			type: this.type,
			name: this.type === 'channel' ? this.team_factory.random_name() : null,
			team_id: this.team._id,
			member_ids: [this.team_creator_data.user._id]
		};
		this.post_factory.create_random_post(
			(error, response) => {
				if (error) { return callback(error); }
				this.message = { stream: response.stream };
				callback();
			},
			{
				token: this.post_creator_data.access_token,
				team_id: this.team._id,
				stream: stream_options
			}
		);
	}

	// called if message doesn't arrive after timeout, in this case, this is what we want
	message_timeout () {
		this.message_callback();
	}

	// called when a message has been received, in this case this is bad
	message_received (error) {
		if (error) { return this.message_callback(error); }
		Assert.fail('message was received');
	}
}

module.exports = New_Stream_No_Message_Test;
