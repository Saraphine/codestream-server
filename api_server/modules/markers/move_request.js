// handle the PUT /markers/:id/move request,
// to move the location for a marker

'use strict';

const RestfulRequest = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/lib/util/restful/restful_request');
const MarkerCreator = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/modules/markers/marker_creator');
const ModelSaver = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/lib/util/restful/model_saver');
const RepoIndexes = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/modules/repos/indexes');
const RepoMatcher = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/modules/repos/repo_matcher');

class MoveRequest extends RestfulRequest {

	// authorize the request for the current user
	async authorize () {
		this.marker = await this.user.authorizeMarker(this.request.params.id, this);
		if (!this.marker) {
			throw this.errorHandler.error('updateAuth');
		}
	}

	// process the request...
	async process () {
		await this.getTeam();			// get the team, required for marker creation
		await this.getTeamRepos();		// get all the repos for a team, required for marker creation
		await this.createNewMarker();	// create a new marker, this supersedes the previous marker
		await this.updateMarker();		// update the superseded marker with the new marker
		await this.updateCodemark();	// update the markers pointed to by the codemark
	}

	// get the team
	async getTeam () {
		this.team = await this.data.teams.getById(this.marker.get('teamId'));
		if (!this.team) {
			throw this.errorHandler.error('notFound', { info: 'team' }); // shouldn't happen
		}
	}

	// get all the repos known to this team, we'll try to match the repo that any
	// markers are associated with with one of these repos
	async getTeamRepos () {
		this.teamRepos = await this.data.repos.getByQuery(
			{ 
				teamId: this.team.id,
				deactivated: false
			},
			{ 
				hint: RepoIndexes.byTeamId 
			}
		);
		this.repoMatcher = new RepoMatcher({
			request: this,
			team: this.team,
			teamRepos: this.teamRepo
		});
	}

	// moving a marker actually entails creating a new one, and then referencing the old one
	async createNewMarker () {
		const markerInfo = this.request.body;

		// get these attributes from the previous incarnation, they are not changeable
		['teamId', 'providerType', 'postStreamId', 'postId'].forEach(attribute => {
			if (this.marker.get(attribute)) {
				markerInfo[attribute] = this.marker.get(attribute);
			}
			else {
				delete markerInfo[attribute];
			}
		});

		// create a new marker to supersede this marker
		this.transforms.createdMarker = await new MarkerCreator({
			request: this,
			supersedesMarkerId: this.marker.id,
			codemarkId: this.marker.get('codemarkId'),
			teamRepos: this.teamRepos,
			repoMatcher: this.repoMatcher
		}).createMarker(markerInfo);
	}

	// update the superseded incarnation of the marker with the ID of the superseding marker
	async updateMarker () {
		const op = { 
			$set: {
				modifiedAt: Date.now(),
				supersededByMarkerId: this.transforms.createdMarker.id
			}
		};
		this.transforms.updateMarkerOp = await new ModelSaver({
			request: this.request,
			collection: this.data.markers,
			id: this.marker.id
		}).save(op);
	}

	// update the codemark to have the new marker 
	async updateCodemark () {
		const op = {
			$push: {
				markerIds: this.transforms.createdMarker.id,
				fileStreamIds: this.transforms.createdMarker.get('fileStreamId')
			},
			$set: {
				modifiedAt: Date.now()
			}
		};
		this.transforms.updateCodemarkOp = await new ModelSaver({
			request: this.request,
			collection: this.data.codemarks,
			id: this.marker.get('codemarkId')
		}).save(op);
	}

	// form the response to the request
	async handleResponse () {
		if (this.gotError) {
			return await super.handleResponse();
		}

		// return the created marker, the superseded marker, and the updated codemark in the response
		this.responseData = { 
			markers: [
				this.transforms.createdMarker.getSanitizedObject(),
				this.transforms.updateMarkerOp
			],
			codemark: this.transforms.updateCodemarkOp
		};

		// handle various data transforms that may have occurred as a result of creating the new marker
		const { transforms, responseData } = this;

		// add any repos created for posts with codemarks and markers
		if (transforms.createdRepos && transforms.createdRepos.length > 0) {
			responseData.repos = transforms.createdRepos.map(repo => repo.getSanitizedObject({ request: this }));
		}

		// add any repos updated for posts with codemarks and markers, which may have brought 
		// new remotes into the fold for the repo
		if (transforms.repoUpdates && transforms.repoUpdates.length > 0) {
			responseData.repos = [
				...(responseData.repos || []),
				...transforms.repoUpdates
			];
		}

		// add any file streams created for markers
		if (transforms.createdStreamsForMarkers && transforms.createdStreamsForMarkers.length > 0) {
			responseData.streams = transforms.createdStreamsForMarkers.map(stream => stream.getSanitizedObject({ request: this }));
		}

		// markers with locations will have a separate markerLocations object
		if (transforms.markerLocations && transforms.markerLocations.length > 0) {
			responseData.markerLocations = transforms.markerLocations;
		}

		await super.handleResponse();
	}

	// after the marker is updated...
	async postProcess () {
		await this.publishMarker();
	}

	// publish the change in marker data to the team
	async publishMarker () {
		const channel = `team-${this.team.id}`;
		const message = {
			...this.responseData,
			requestId: this.request.id
		};
		try {
			await this.api.services.broadcaster.publish(
				message,
				channel,
				{ request: this.request	}
			);
		}
		catch (error) {
			// this doesn't break the chain, but it is unfortunate...
			this.warn(`Could not publish marker move message to team ${this.team.id}: ${JSON.stringify(error)}`);
		}
	}

	// describe this route for help
	static describe () {
		return {
			tag: 'move-marker',
			summary: 'Move the code block pointed to by a marker',
			access: 'User must be a member of the team that owns the marker',
			description: 'The act of changing the code block associated with a codemark actually creates a new marker. The old marker then gets its supersededByMarkerId attribute set, and the new marker will have its supersedesMarkerId attribute set, so the two markers point to each other. The client should consider markers with a supersededByMarkerId attribute inactive.',
			input: {
				summary: 'Specify the marker ID in the request path, and the marker attributes in the request body',
				looksLike: '<Marker attributes>'
			},
			returns: {
				summary: 'A directive indicating how to update the marker, and also to add a marker location',
				looksLike: {
					marker: '<some directive>',
					markerLocations: '<markerLocations update>'
				}
			},
			publishes: 'The response data will be published on the team channel for the team that owns the marker',
			errors: [
				'updateAuth',
				'createAuth',
				'notFound',
				'validation'
			]
		};
	}
}

module.exports = MoveRequest;
