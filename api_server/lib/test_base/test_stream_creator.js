'use strict';

const BoundAsync = require(process.env.CSSVC_BACKEND_ROOT + '/shared/server_utils/bound_async');

/* eslint complexity: 0 */

class TestStreamCreator {

	constructor (options) {
		Object.assign(this, options);
	}

	create (callback) {
		BoundAsync.series(this, [
			this.createStream,
			this.createPosts
		], error => {
			if (error) { return callback(error); }
			callback(null, {
				stream: this.stream,
				postData: this.postData,
				inputPostData: this.inputPostData
			});
		});
	}

	createStream (callback) {
		if (typeof this.streamOptions.creatorIndex !== 'number' || !this.streamOptions.type) {
			return callback();
		}
		throw 'creation of streams is deprecated';
		const streamOptions = {
			type: this.streamOptions.type,
			privacy: this.streamOptions.privacy,
			isTeamStream: this.streamOptions.isTeamStream,
			teamId: this.team.id
		};
		if (this.streamOptions.type === 'file' && this.repo) {
			streamOptions.repoId = this.repo.id;
		}
		streamOptions.token = this.users[this.streamOptions.creatorIndex].accessToken;
		const hasMembers = (
			streamOptions.type === 'direct' ||
			(
				streamOptions.type === 'channel' && 
				!this.streamOptions.isTeamStream
			)
		);
		if (hasMembers) {
			if (this.streamOptions.members === 'all') {
				streamOptions.memberIds = this.users.map(u => u.user.id);
			}
			else if (this.streamOptions.members instanceof Array) {
				streamOptions.memberIds = [];
				this.streamOptions.members.forEach(userIndex => {
					streamOptions.memberIds.push(this.users[userIndex].user.id);
				});
			}
		}

		this.test.streamFactory.createRandomStream(
			(error, response) => {
				if (error) { return callback(error); }
				this.stream = response.stream;
				callback();
			},
			streamOptions
		);
	}

	createPosts (callback) {
		this.postData = [];
		this.inputPostData = [];
		if (
			!this.postOptions || 
			(
				typeof this.postOptions.creatorIndex !== 'number' && 
				!(this.postOptions.creatorIndex instanceof Array)
			)
		) {
			return callback();
		}
		BoundAsync.timesSeries(
			this,
			this.postOptions.numPosts || 0,
			this.createPost,
			callback
		);
	}

	createPost (n, callback) {
		if (!this.stream && !this.teamStream) {
			throw 'no stream for creating test post';
		}

		const postOptions = {
			streamId: this.stream ? this.stream.id : this.teamStream.id
		};

		if (
			this.postOptions.wantCodemark ||
			(
				this.postOptions.postData && 
				this.postOptions.postData[n] && 
				this.postOptions.postData[n].wantCodemark
			)
		) {
			this.setCodemarkOptions(postOptions, n);	
			if (this.postOptions.postData && this.postOptions.postData[n]) {
				delete this.postOptions.postData[n].wantCodemark;
			}
		}

		if (
			this.postOptions.wantReview ||
			(
				this.postOptions.postData && 
				this.postOptions.postData[n] && 
				this.postOptions.postData[n].wantReview
			)
		) {
			postOptions.wantMarkers = this.postOptions.wantMarkers;
			postOptions.numChanges = this.postOptions.numChanges;
			if (this.repos.length > 1) {
				postOptions.changesetRepoIds = this.repos.map(repo => repo.id);
			}
			else {
				postOptions.changesetRepoId = this.postOptions.changesetRepoId || (this.repo && this.repo.id);
			}
			this.setReviewOptions(postOptions, n);	
			if (this.postOptions.postData && this.postOptions.postData[n]) {
				delete this.postOptions.postData[n].wantReview;
			}
		}

		if (
			this.postOptions.wantCodeError ||
			(
				this.postOptions.postData && 
				this.postOptions.postData[n] && 
				this.postOptions.postData[n].wantCodeError
			)
		) {
			this.setCodeErrorOptions(postOptions, n);	
			if (this.postOptions.postData && this.postOptions.postData[n]) {
				delete this.postOptions.postData[n].wantCodeError;
			}
		}
	
		if (this.postOptions.postData && this.postOptions.postData[n]) {
			const postData = this.postOptions.postData[n];
			if (typeof postData.replyTo !== 'undefined') {
				postOptions.parentPostId = this.postData[postData.replyTo].post.id;
				postOptions.streamId = this.postData[postData.replyTo].post.streamId;
				delete postData.replyTo;
			}
			Object.assign(postOptions, this.postOptions.postData[n]);
		}

		let creatorIndex;
		if (this.postOptions.postData && this.postOptions.postData[n] && this.postOptions.postData[n].creatorIndex !== undefined) {
			creatorIndex = this.postOptions.postData[n].creatorIndex;
		} else {
			creatorIndex = this.postOptions.creatorIndex instanceof Array ? 
				this.postOptions.creatorIndex[n] :
				this.postOptions.creatorIndex;
		}
	
		postOptions.token = this.users[creatorIndex || 0].accessToken;
		this.test.postFactory.createRandomPost(
			(error, response) => {
				if (error) { return callback(error); }
				this.inputPostData.push(this.test.postFactory.lastInputData);
				this.postData.push(response);
				const wait = this.postOptions.postCreateThrottle || 0;
				setTimeout(callback, wait);
			},
			postOptions
		);
	}

	setCodemarkOptions (options, n) {
		options.wantCodemark = true;

		if (this.postOptions.wantMarker || 
			(this.postOptions.postData && this.postOptions.postData[n] && this.postOptions.postData[n].wantMarker)) {
			this.setMarkerOptions(options);
		}

		if (this.postOptions.codemarkTypes) {
			if (this.postOptions.assignedTypes) {
				options.codemarkType = this.postOptions.codemarkTypes[this.postOptions.assignedTypes[n]];
			}
			else {
				const typeIndex = Math.floor(Math.random() * this.postOptions.codemarkTypes.length);
				options.codemarkType = this.postOptions.codemarkTypes[typeIndex];
			}
		}
		else if (this.postOptions.codemarkType) {
			options.codemarkType = this.postOptions.codemarkType;
		}
	}

	setReviewOptions (options, n) {
		options.wantReview = true;
		if (
			!this.postOptions.changesetRepoId &&
			!this.postOptions.changesetRepoIds &&
			this.repo
		) {
			this.postOptions.changesetRepoId = this.repo.id;
		}
		if (this.postOptions.wantMarkers || 
			(this.postOptions.postData && this.postOptions.postData[n] && this.postOptions.postData[n].wantMarkers)) {
			this.setMarkerOptions(options);
		}
	}

	setCodeErrorOptions (options, n) {
		options.wantCodeError = true;
	}

	setMarkerOptions (options) {
		options.wantMarkers = options.wantMarkers || this.postOptions.wantMarkers || 1;
		if (typeof this.postOptions.markerStreamId !== 'undefined') {
			if (
				typeof this.postOptions.markerStreamId === 'number' &&
				this.repoStreams
			) {
				options.fileStreamId = this.repoStreams[this.postOptions.markerStreamId].id;
			}
			else {
				options.fileStreamId = this.postOptions.markerStreamId;
			}
		}
		else {
			options.withRandomStream = true;
		}
		if (this.postOptions.commitHash) {
			options.commitHash = this.postOptions.commitHash;
		}
	}
}

module.exports = TestStreamCreator;

