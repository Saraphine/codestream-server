// attributes for stream documents/models

'use strict';

module.exports = {
	teamId: {
		type: 'id',
		description: 'ID of the @@#team#team@@ to which this stream belongs'
	},
	repoId: {
		type: 'id',
		description: 'For file streams, the ID of the repo to which the file that is associated with this stream belongs'
	},
	type: {
		type: 'streamType', // channel, direct, file
		maxLength: 7,
		description: 'Type of stream, one of: file, channel, direct (strictly enforced)'
	},
	file: {
		type: 'string',
		maxLength: 1024,
		description: 'For file streams, the path of the file, assumed to be from the root of the @@#repo#repo@@'
	},
	name: {
		type: 'channelName',
		maxLength: 100,
		description: 'For channel streams, the name of the stream'
	},
	memberIds: {
		type: 'arrayOfIds',
		maxLength: 256,
		description: 'For channel and direct streams, ID of @@#users#user@@ representing the members of the stream'
	},
	isTeamStream: {
		type: 'boolean',
		description: 'Indicates a channel stream that automatically has all members of the owning @@#team#team@@ as members'
	},
	mostRecentPostId: {
		type: 'id',
		description: 'ID of the most recent @@#post#post@@ that was posted to the stream'
	},
	mostRecentPostCreatedAt: {
		type: 'timestamp',
		description: 'Timestamp representing when the most recent @@#post#post@@ was posted to the stream'
	},
	sortId: {
		type: 'id',
		description: 'Consistent sort value for pagination; if the stream has @@#posts#post@@, this will be equal to mostRecentPostId; if the stream has no posts, will be equal to the ID of the stream (which is time-ordered)'
	},
	numMarkers: {
		type: 'number',
		description: 'For file streams, the total number of @@#markers#marker@@ referring to this stream'
	},
	nextSeqNum: {
		type: 'number',
		serverOnly: true
	},
	editingUsers: {
		type: 'object',
		description: 'Object of @@#users#user@@ who are currently editing this stream'
	},
	emailNotificationSeqNum: {
		type: 'number',
		serverOnly: true
	},
	emailNotificationSeqNumSetAt: {
		type: 'timestamp',
		serverOnly: true
	},
	privacy: {
		type: 'privacyType', // public, private
		maxLength: 20,
		required: true,
		description: 'Can be "public" or "private", if "public", all @@#users#user@@ can see that this stream exists, even if they are not members; if "private", only users who are members can see the stream; file streams are always public, direct messages are always private, but channels can be either'
	},
	purpose: {
		type: 'string',
		maxLength: 250,
		description: 'The purpose of this stream (usually for channels)'
	},
	isArchived: {
		type: 'boolean',
		description: 'Whether the stream (usually for channels) is archived'
	},
	serviceType: {
		type: 'string',
		maxLength: 25,
		description: 'For channel streams created for a particular service (eg. LiveShare), indicates the service type'
	},
	serviceKey: {
		type: 'string',
		maxLength: 100,
		description: 'For channel streams created for a particular service (eg. LiveShare), uniquely identifies the service session'
	},
	serviceInfo: {
		type: 'object',
		maxLength: 10000,
		description: 'For channel streams created for a particular service (eg. LiveShare), holds any meta-data associated with the service session'
	},
	accountId: {
		type: 'number',
		description: 'For object streams, the account ID of the account that owns the object'
	},
	objectId: {
		type: 'string',
		maxLength: 200,
		description: 'For object streams, the object identifier for the object'
	},
	objectType: {
		type: 'string',
		maxLength: 200,
		description: 'For object streams, object type for the object'
	}
};
