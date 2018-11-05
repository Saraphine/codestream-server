// handle a GET /posts request to fetch several posts

'use strict';

const GetManyRequest = require(process.env.CS_API_TOP + '/lib/util/restful/get_many_request');
const Indexes = require('./indexes');
const PostErrors = require('./errors.js');

// these parameters essentially get passed verbatim to the query
const BASIC_QUERY_PARAMETERS = [
	'teamId',
	'streamId',
	'parentPostId'
];

// additional options for post fetches
const NON_FILTERING_PARAMETERS = [
	'limit',
	'sort',
	'commitHash'
];

const RELATIONAL_PARAMETERS = [
	'before',
	'after',
	'inclusive'
];

class GetPostsRequest extends GetManyRequest {

	constructor (options) {
		super(options);
		this.errorHandler.add(PostErrors);
	}

	// authorize the request for the current user
	async authorize () {
		const info = await this.user.authorizeFromTeamIdAndStreamId(
			this.request.query,
			this
		);
		Object.assign(this, info);
	}

	// build the query to use for fetching posts (used by the base class GetManyRequest)
	buildQuery () {
		const query = {};
		// process each parameter in turn
		for (let parameter in this.request.query || {}) {
			if (this.request.query.hasOwnProperty(parameter)) {
				const value = decodeURIComponent(this.request.query[parameter]);
				parameter = decodeURIComponent(parameter);
				const error = this.processQueryParameter(parameter, value, query);
				if (error) {
					return error;
				}
			}
		}
		this.handleRelationals(query);
		if (Object.keys(query).length === 0) {
			return null;	// no query parameters, will assume fetch by ID
		}
		return query;
	}

	// process a single incoming query parameter
	processQueryParameter (parameter, value, query) {
		if (BASIC_QUERY_PARAMETERS.includes(parameter)) {
			// basic query parameters go directly into the query (but lowercase)
			query[parameter] = value.toLowerCase();
		}
		else if (parameter === 'ids') {
			// fetch by array of IDs
			const ids = value.split(',');
			query._id = this.data.posts.inQuerySafe(ids);
		}
		else if (RELATIONAL_PARAMETERS.includes(parameter)) {
			// before, after, inclusive
			const error = this.processRelationalParameter(parameter, value, query);
			if (error) { return error; }
		}
		else if (!NON_FILTERING_PARAMETERS.includes(parameter)) {
			// sort, limit
			return 'invalid query parameter: ' + parameter;
		}
	}

	// process a relational parameter for seqnums (before, after, inclusive) ... for fetching in pages by seqnum
	processRelationalParameter (parameter, value) {
		this.bySeqNum = true;
		this.relationals = this.relationals || {};
		if (parameter === 'inclusive') {
			this.relationals.inclusive = true;
		}
		else {
			const seqNum = parseInt(value, 10);
			if (isNaN(seqNum) || seqNum.toString() !== value) {
				return 'invalid seqnum: ' + value;
			}
			this.relationals[parameter] = seqNum;
		}
	}

	// form the collected relationals, for the final query
	handleRelationals (query) {
		if (!this.relationals) { return; }
		const { before, after, inclusive } = this.relationals;
		query.seqNum = {};
		if (before !== undefined) {
			if (inclusive) {
				query.seqNum.$lte = before;
			}
			else {
				query.seqNum.$lt = before;
			}
		}
		if (after !== undefined) {
			if (inclusive) {
				query.seqNum.$gte = after;
			}
			else {
				query.seqNum.$gt = after;
			}
		}
	}

	// get database options to use in the query
	getQueryOptions () {
		const limit = this.limit = this.setLimit();
		const sort = this.setSort();
		const hint = this.setHint();
		return { limit, sort, hint };
	}

	// set the limit to use in the fetch query, according to options passed in
	setLimit () {
		// the limit can never be greater than maxPostsPerRequest
		let limit = 0;
		if (this.request.query.limit) {
			limit = decodeURIComponent(this.request.query.limit);
			limit = parseInt(limit, 10);
		}
		limit = limit ?
			Math.min(limit, this.api.config.limits.maxPostsPerRequest || 100) :
			this.api.config.limits.maxPostsPerRequest;
		limit += 1;	// always look for one more than the client, so we can set the "more" flag
		return limit;
	}

	// set the sort order for the fetch query
	setSort () {
		// posts are sorted in descending order by ID unless otherwise specified
		let sort = { _id: -1 };
		if (this.request.query.sort && this.request.query.sort.toLowerCase() === 'asc') {
			sort = { _id: 1 };
		}
		else if (this.bySeqNum) {
			sort = { seqNum: 1 };
		}
		return sort;
	}

	// set the indexing hint to use in the fetch query
	setHint () {
		if (this.request.query.parentPostId) {
			return Indexes.byParentPostId;
		}
		else if (this.bySeqNum) {
			return Indexes.bySeqNum;
		}
		else {
			return Indexes.byId;
		}
	}

	// process the request (overrides base class)
	async process () {
		await super.process();	// do the usual "get-many" processing
		await this.getCodeMarks();	// get associated codemarks, as needed
		await this.getMarkers();	// get associated markers, as needed

		// add the "more" flag as needed, if there are more posts to fetch ...
		// we always fetch one more than the page requested, so we can set that flag
		if (this.responseData.posts.length === this.limit) {
			this.responseData.posts.splice(-1);
			this.responseData.more = true;
		}
	}

	// get the codemarks associated with the fetched posts, as needed
	async getCodeMarks () {
		const codemarkIds = this.models.reduce((codemarkIds, post) => {
			if (post.get('codemarkId')) {
				codemarkIds.push(post.get('codemarkId'));
			}
			return codemarkIds;
		}, []);
		if (codemarkIds.length === 0) {
			return;
		}
		this.codemarks = await this.data.codemarks.getByIds(codemarkIds);
		this.responseData.codemarks = this.codemarks.map(codemark => codemark.getSanitizedObject());
	}

	// get the markers associated with the fetched posts, as needed
	async getMarkers () {
		if (!this.codemarks) { return; }
		const markerIds = this.codemarks.reduce((markerIds, post) => {
			markerIds.push(...(post.get('markerIds') || []));
			return markerIds;
		}, []);
		if (markerIds.length === 0) {
			return;
		}
		const markers = await this.data.markers.getByIds(markerIds);
		this.responseData.markers = markers.map(marker => marker.getSanitizedObject());
	}

	// describe this route for help
	static describe (module) {
		const description = GetManyRequest.describe(module);
		description.description = 'Returns an array of posts for a given stream (given by stream ID), governed by the query parameters. Posts are fetched in pages of no more than 100 at a time. Posts are fetched in descending order unless otherwise specified by the sort parameter. To fetch in pages, continue to fetch until the "more" flag is not seen in the response, using the lowest sequence number fetched by the previous operation (or highest, if fetching in ascending order) along with the "before" operator (or "after" for ascending order).';
		description.access = 'User must be a member of the stream';
		Object.assign(description.input.looksLike, {
			'teamId*': '<ID of the team that owns the stream for which posts are being fetched>',
			'streamId': '<ID of the stream for which posts are being fetched>',
			'parentPostId': '<Fetch only posts that are replies to the post given by this ID>',
			'sort': '<Posts are sorted in descending order, unless this parameter is given as \'asc\'>',
			'limit': '<Limit the number of posts fetched to this number>',
			'before': '<Fetch posts before this sequence number, including the post with that sequence number if "inclusive" set>',
			'after': '<Fetch posts after this sequence number, including the post with that sequence number if "inclusive" is set>',
			'inclusive': '<If before or after or both are set, indicated to include the reference post in the returned posts>'
		});
		description.returns.summary = 'An array of post objects, plus possible codemark, marker and markerLocations object, and more flag';
		Object.assign(description.returns.looksLike, {
			posts: '<@@#post objects#codemark@@ fetched>',
			codemarks: '<associated @@#codemark objects#codemark@@>',
			markers: '<associated @@#markers#markers@@>',
			more: '<will be set to true if more posts are available, see the description, above>'
		});
		description.errors = description.errors.concat([
			'invalidParameter',
			'notFound'
		]);
		return description;
	}
}

module.exports = GetPostsRequest;
