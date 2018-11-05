// test constants for testing the markers module

'use strict';

const MarkerAttributes = require(process.env.CS_API_TOP + '/modules/markers/marker_attributes');
const MarkerLocationsAttributes = require(process.env.CS_API_TOP + '/modules/marker_locations/marker_locations_attributes');
const CodeMarkAttributes = require(process.env.CS_API_TOP + '/modules/codemarks/codemark_attributes');
const PostAttributes = require(process.env.CS_API_TOP + '/modules/posts/post_attributes');

const EXPECTED_MARKER_FIELDS = [
	'_id',
	'deactivated',
	'createdAt',
	'modifiedAt',
	'creatorId',
	'teamId',
	'fileStreamId',
	'postStreamId',
	'commitHashWhenCreated',
	'locationWhenCreated',
	'code',
	'file',
	'repo',
	'repoId'
];

const UNSANITIZED_ATTRIBUTES = Object.keys(MarkerAttributes).filter(attribute => {
	return MarkerAttributes[attribute].serverOnly;
});

const UNSANITIZED_MARKER_LOCATIONS_ATTRIBUTES = Object.keys(MarkerLocationsAttributes).filter(attribute => {
	return MarkerLocationsAttributes[attribute].serverOnly;
});

const UNSANITIZED_CODEMARK_ATTRIBUTES = Object.keys(CodeMarkAttributes).filter(attribute => {
	return CodeMarkAttributes[attribute].serverOnly;
});

const UNSANITIZED_POST_ATTRIBUTES = Object.keys(PostAttributes).filter(attribute => {
	return PostAttributes[attribute].serverOnly;
});

module.exports = {
	EXPECTED_MARKER_FIELDS,
	UNSANITIZED_ATTRIBUTES,
	UNSANITIZED_MARKER_LOCATIONS_ATTRIBUTES,
	UNSANITIZED_CODEMARK_ATTRIBUTES,
	UNSANITIZED_POST_ATTRIBUTES
};
