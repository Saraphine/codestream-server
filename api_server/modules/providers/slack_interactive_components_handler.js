const { WebClient } = require('@slack/web-api');
const Fetch = require('node-fetch');
const url = require('url');
const AddTeamMember = require(process.env.CS_API_TOP + '/modules/teams/add_team_member');
const UserCreator = require(process.env.CS_API_TOP +
	'/modules/users/user_creator');
const PostCreator = require(process.env.CS_API_TOP +
	'/modules/posts/post_creator');
const UserIndexes = require(process.env.CS_API_TOP + '/modules/users/indexes');
const PostIndexes = require(process.env.CS_API_TOP + '/modules/posts/indexes');
const { post } = require(process.env.CS_API_TOP + '/server_utils/https_bot');
const SlackInteractiveComponentBlocks = require('./slack_interactive_component_blocks');
const { keyBy } = require('lodash');
const MomentTimezone = require('moment-timezone');

class SlackInteractiveComponentsHandler {
	constructor (request, payloadData) {
		Object.assign(this, request);

		this.log = request.api.log;
		this.logger = this.api.logger;

		this.payload = payloadData.payload;
		this.actionPayload = payloadData.actionPayload;
	}

	async process () {
		// this.log(JSON.stringify(this.payload, null, 4));
		this.log(
			`Processing payload.type=${this.payload.type}, actionPayload.linkType=${this.actionPayload.linkType}`
		);

		if (this.payload.type === 'block_actions') {
			if (this.actionPayload.linkType === 'reply') {
				return this.handleBlockActionReply();
			} else {
				return this.handleBlockActionGeneric();
			}
		} else if (this.payload.type === 'view_submission') {
			return this.handleViewSubmission();
		} else {
			this.log(`payload.type=${this.payload.type} cannot be handled.`);
		}
		return undefined;
	}

	async handleBlockActionGeneric () {
		const teamId = this.actionPayload.teamId || this.actionPayload.tId;
		let payloadActionUser = await this.getUser(this.payload.user.id);
		if (!payloadActionUser) {
			// if we can't find a user that has auth'd with slack, try to find a matching faux user
			payloadActionUser = await this.getFauxUser(teamId, this.payload.user.team_id, this.payload.user.id);
		}
		const team = await this.getTeam(
			payloadActionUser,
			teamId
		);
		return {
			actionUser: payloadActionUser,
			actionTeam: team,
			payloadUserId: this.payload.user.id
		};
	}

	async handleViewSubmission () {
		let privateMetadata;
		let userThatCreated;
		let userThatClicked;
		let userThatClickedIsFauxUser;
		let team;
		let error;
		try {
			privateMetadata = JSON.parse(this.payload.view.private_metadata);
		} catch (ex) {
			this.log('could not parse private_metadata');
			return undefined;
		}
		try {
			const users = await this.getUsers();
			userThatClicked = users.userThatClicked;
			userThatCreated = users.userThatCreated;
			userThatClickedIsFauxUser = !!users.userThatClickedIsFauxUser;

			team = await this.getTeamById(privateMetadata.tId);
			if (!privateMetadata.ppId) {
				this.log('parentPostId is missing');
				return {
					actionUser: userThatClicked,
					actionTeam: team,
					error: {
						eventName: 'Provider Reply Denied',
						reason: 'ReplySubmissionParentPostIdMissing'
					},
					payloadUserId: this.payload.user.id
				};
			}

			if (!userThatClicked) {
				const user = await this.createFauxUser(team,
					this.getAccessToken(userThatCreated || userThatClicked, privateMetadata.tId, this.payload.user.team_id));
				if (user) {
					userThatClicked = user;
					userThatClickedIsFauxUser = true;
					this.createdUser = user;
				}
				else {
					this.log('User is missing / could not create faux user');
					return {
						error: {
							eventName: 'Provider Reply Denied',
							reason: 'ReplySubmissionUserMissing'
						},
						actionUser: userThatClicked,
						payloadUserId: this.payload.user.id,
						actionTeam: team
					};
				}
			}

			const text = SlackInteractiveComponentBlocks.getReplyText(
				this.payload.view.state
			);
			if (!text) {
				this.log('text is missing');
				return {
					error: {
						eventName: 'Provider Reply Denied',
						reason: 'ReplySubmissionTextMissing'
					},
					actionUser: userThatClicked,
					payloadUserId: this.payload.user.id,
					actionTeam: team
				};
			}

			this.user = userThatClicked;
			this.team = team;
			this.postCreator = new PostCreator({
				request: this
			});

			await this.postCreator.createPost({
				streamId: privateMetadata.sId,
				text: text,
				// TODO what goes here?
				origin: 'Slack',
				parentPostId: privateMetadata.ppId
			});
		} catch (err) {
			this.log(err);
			error = {
				eventName: 'Provider Reply Denied',
				reason: 'ReplySubmissionGenericError'
			};
		}

		return {
			actionUser: userThatClicked,
			payloadUserId: this.payload.user.id,
			actionTeam: team,
			error: error,
			// this is the responseData that we'll send back to slack
			// NOTE it cannot contain any other extra properties, only what Slack expects
			responseData: {
				response_action: 'update',
				view: SlackInteractiveComponentBlocks.createModalUpdatedView(userThatCreated, userThatClickedIsFauxUser)
			}
		};
	}

	async createFauxUser (team, accessToken) {
		let response;
		try {
			try {
				response = await this.getUserFromSlack(this.payload.user.id, accessToken);
			}
			catch (ex) {
				this.log(ex);
			}
			const userData = {
				username: this.payload.user.name,
				fullName: this.payload.user.name
			};

			if (response && response.ok) {
				userData.email = response.user.profile.email;
				userData.username = response.user.name;
				userData.fullName = response.user.profile.real_name;
				userData.timeZone = response.user.tz;
			}

			this.userCreator = new UserCreator({
				request: this,
				teamIds: [team.get('id')],
				userBeingAddedToTeamId: team.get('id'),
				externalUserId: `slack::${team.get('id')}::${this.payload.user.team_id}::${this.payload.user.id}`,
				dontSetInviteCode: true,
				ignoreUsernameOnConflict: true
			});
			let user = await this.userCreator.createUser(userData);
			await new AddTeamMember({
				request: this,
				addUser: user,
				team: team
			}).addTeamMember();

			user = await this.data.users.getById(user.id);
			return user;
		}
		catch (ex) {
			this.log(ex);
		}
		return undefined;
	}

	getSlackExtraData (user) {
		const providerInfo = user && user.get('providerInfo');
		const slackProviderInfo = providerInfo && providerInfo[`${this.actionPayload.tId}`].slack.multiple[this.payload.user.team_id];
		return slackProviderInfo && slackProviderInfo.extra;
	}

	mergeActionPayloadData (codemark) {
		if (!codemark) return;

		// hydrate this object with some additional properties taken from the codemark
		this.actionPayload = {
			...this.actionPayload,
			sId: codemark.get('streamId'),
			tId: codemark.get('teamId'),
			crId: codemark.get('creatorId'),
			ppId: codemark.get('postId')
		};
	}

	async handleBlockActionReply () {
		let client;
		let payloadActionUser;
		let success = false;
		const timeStart = new Date();
		const codemark = await this.data.codemarks.getById(this.actionPayload.cId);
		this.mergeActionPayloadData(codemark);

		const team = await this.getTeamById(this.actionPayload.tId);
		if (!codemark || codemark.get('deactivated')) {
			await this.postEphemeralMessage(
				this.payload.response_url,
				SlackInteractiveComponentBlocks.createMarkdownBlocks('Sorry, we couldn\'t find that codemark')
			);
			return {
				error: {
					eventName: 'Provider Reply Denied',
					reason: 'OpenCodemarkCodemarkNotFound'
				}
			};
		}
		// we are getting two users, but only using one of their accessTokens.
		// this is to allow non Slack authed users to reply from slack wo/having CS
		const { userThatCreated, userThatClicked } = await this.getUsers();
		if (!userThatCreated && !userThatClicked) {
			return undefined;
		}

		payloadActionUser = userThatClicked;

		if (!team) {
			await this.postEphemeralMessage(
				this.payload.response_url,
				SlackInteractiveComponentBlocks.createMarkdownBlocks('Sorry, we couldn\'t find your team')
			);
			return undefined;
		}

		const blocks = await this.createModalBlocks(codemark, userThatClicked);
		let caughtSlackError = undefined;
		const users = [userThatCreated, userThatClicked];
		for (let i = 0; i < users.length; i++) {
			caughtSlackError = false;
			const user = users[i];
			if (!user) continue;

			client = await this.tryCreateClient(user, this.payload.user);
			if (!client) continue;

			let modalResponse;
			try {
				modalResponse = await client.views.open({
					trigger_id: this.payload.trigger_id,
					view: SlackInteractiveComponentBlocks.createModalView(
						this.payload,
						this.actionPayload,
						blocks
					)
				});
				if (modalResponse && modalResponse.ok) {
					success = true;
					// note, this message assumes that the first user is the creator
					this.log(
						`Using token from the user that ${i == 0 ? 'created' : 'clicked'} the button. userId=${user.get('_id')}`
					);

					break;
				}
			} catch (ex) {
				this.log(ex);
				caughtSlackError = ex;
				if (ex.data) {
					try {
						this.log(JSON.stringify(ex.data));
					} catch (x) {
						// suffer
					}
				}
			}
		}

		if (!success) {
			const timeEnd = new Date();
			const timeDiff = timeStart.getTime() - timeEnd.getTime();
			const secondsBetween = Math.abs(timeDiff / 1000);
			let errorReason;
			if (secondsBetween >= 3) {
				await this.postEphemeralMessage(
					this.payload.response_url,
					SlackInteractiveComponentBlocks.createMarkdownBlocks('We took too long to respond, please try again. ')
				);
				this.log(`Took too long to respond (${secondsBetween} seconds)`);
				errorReason = 'OpenCodemarkResponseTooSlow';
			}
			else {
				if (caughtSlackError) {
					await this.postEphemeralMessage(
						this.payload.response_url,
						SlackInteractiveComponentBlocks.createMarkdownBlocks('Oops, something happened. Please try again. ')
					);
					this.log(`Oops, something happened. ${caughtSlackError}`);
					errorReason = 'OpenCodemarkGenericInternalError';
				}
				else {
					await this.postEphemeralMessage(
						this.payload.response_url,
						SlackInteractiveComponentBlocks.createRequiresAccess()
					);
					this.log('Was not able to show a modal (generic)');
					errorReason = 'OpenCodemarkGenericError';
				}
			}

			return {
				actionUser: payloadActionUser,
				actionTeam: team,
				error: {
					eventName: 'Provider Reply Denied',
					reason: errorReason
				},
				payloadUserId: this.payload.user.id
			};
		}

		return {
			actionUser: payloadActionUser,
			actionTeam: team,
			payloadUserId: this.payload.user.id
		};
	}

	async getUser (slackUserId) {
		if (!slackUserId) return undefined;

		const users = await this.data.users.getByQuery(
			{
				providerIdentities: `slack::${slackUserId}`,
				deactivated: false
			},
			{ hint: UserIndexes.byProviderIdentities }
		);

		if (users.length > 1) {
			// this shouldn't really happen
			this.log(`Multiple CodeStream users found matching identity ${slackUserId}`);
			return undefined;
		}
		if (users.length === 1) {
			return users[0];
		}
		return undefined;
	}

	async getFauxUser (codestreamTeamId, slackWorkspaceId, slackUserId) {
		if (!codestreamTeamId || !slackWorkspaceId || !slackUserId) return undefined;

		const query = { externalUserId: `slack::${codestreamTeamId}::${slackWorkspaceId}::${slackUserId}` };
		const users = await this.data.users.getByQuery(query,
			{ hint: UserIndexes.byExternalUserId }
		);

		if (users.length > 1) {
			// this shouldn't really happen
			this.log(`Multiple CodeStream users found matching identity slack workspaceId=${slackWorkspaceId} userId=${slackUserId} on codestream team=${codestreamTeamId}`);
			return undefined;
		}
		if (users.length === 1) {
			const user = users[0];
			if (user.get('deactivated')) return undefined;

			return user;
		}
		return undefined;
	}

	async getUserFromSlack (userId, accessToken) {
		const request = await Fetch(`https://slack.com/api/users.info?user=${userId}`,
			{
				method: 'get',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`
				}
			}
		);
		const response = await request.json();
		if (!response.ok) {
			this.log(`getUserFromSlack error=${response.error}`);
			return undefined;
		}
		return response;
	}

	async getUserByEmail (emailAddress) {
		if (!emailAddress) return undefined;

		const users = await this.data.users.getByQuery(
			{ searchableEmail: emailAddress.toLowerCase() },
			{ hint: UserIndexes.bySearchableEmail }
		);

		if (users.length > 1) {
			// this shouldn't really happen
			this.log(`Multiple CodeStream users found matching email ${emailAddress}`);
			return undefined;
		}
		if (users.length === 1) {
			return users[0];
		}
		return undefined;
	}


	async getCodeStreamUser (codeStreamUserId) {
		return this.data.users.getById(codeStreamUserId);
	}

	// get the team the user is on, matching the identity
	async getTeam (user, teamId) {
		if (!teamId) {
			this.log('Could not find teamId within the  action payload');
			return undefined;
		}
		if (user && !user.hasTeam(teamId)) {
			this.log(
				'User is not a member of the team provided in slack action payload'
			);
			return undefined;
		}
		return this.data.teams.getById(teamId);
	}

	async getTeamById (teamId) {
		if (!teamId) {
			this.log('Could not find teamId within the  action payload');
			return undefined;
		}
		return this.data.teams.getById(teamId);
	}

	async tryCreateClient (user, slackUser) {
		if (!user || !slackUser.team_id) {
			this.log('Missing user or slack user');
			return undefined;
		}

		const providerInfo = user.get('providerInfo');
		if (!providerInfo) return undefined;

		const teamId = this.actionPayload.tId;
		const teamProviderInfo = providerInfo[teamId];
		if (!teamProviderInfo) return undefined;

		if (!teamProviderInfo.slack || !teamProviderInfo.slack.multiple)
			return undefined;

		let authTestResponse;
		try {
			const slackProviderInfo = teamProviderInfo.slack.multiple[slackUser.team_id];
			if (!slackProviderInfo || !slackProviderInfo.accessToken) {
				this.log('Missing slack providerInfo');
				return undefined;
			}
			const client = new WebClient(slackProviderInfo.accessToken);
			authTestResponse = await client.auth.test();
			return authTestResponse && authTestResponse.ok ? client : undefined;
		} catch (x) {
			this.log(authTestResponse);
			this.log(x);
			return undefined;
		}
	}

	async createModalBlocks (codemark, userThatClicked) {
		const slackUserExtra = userThatClicked && this.getSlackExtraData(userThatClicked);
		let replies;
		let postUsers;
		let userIds = [];
		if (this.actionPayload.ppId) {
			// slack blocks have a limit of 100, but we have 3 blocks for each reply...
			replies = await this.data.posts.getByQuery(
				{ parentPostId: this.actionPayload.ppId },
				{ hint: PostIndexes.byParentPostId, sort: { seqNum: -1 }, limit: 30 }
			);
			// get uniques
			userIds = [
				...new Set([
					...replies.map(_ => _.get('creatorId')),
					codemark.get('creatorId')
				])
			];
		} else {
			userIds = [codemark.get('creatorId')];
		}

		postUsers = await this.data.users.getByIds(userIds);
		const usersById = keyBy(postUsers, function (u) {
			return u.get('_id');
		});
		const codemarkUser = usersById[codemark.get('creatorId')];
		const markerMarkdown = await this.createMarkerMarkup(codemark);
		let blocks = [
			{
				type: 'context',
				elements: [{
					type: 'mrkdwn',
					text: `*${(codemarkUser && codemarkUser.get('username')) || 'Unknown User'}* ${this.formatTime(
						userThatClicked,
						codemark.get('createdAt'),
						slackUserExtra && slackUserExtra.tz
					)}`
				}]
			},
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `${codemark.get('text')}${markerMarkdown}`
				}
			}
		];

		blocks.push(SlackInteractiveComponentBlocks.createModalReply());

		const replyBlocks = this.createReplyBlocks(replies, usersById, userThatClicked, slackUserExtra);
		if (replyBlocks && replyBlocks.length) {
			blocks = blocks.concat(replyBlocks);
		}
		return blocks;
	}

	createReplyBlocks (replies, usersById, userThatClicked, slackUserExtra) {
		if (replies && replies.length) {
			const blocks = [];
			for (let i = 0; i < replies.length; i++) {
				const reply = replies[i];
				const replyUser = usersById[reply.get('creatorId')];
				blocks.push(
					{
						type: 'context',
						elements: [{
							type: 'mrkdwn',
							text: `*${(replyUser && replyUser.get('username')) || 'Unknown User'}* ${this.formatTime(
								userThatClicked,
								reply.get('createdAt'),
								slackUserExtra && slackUserExtra.tz
							)}`
						}]
					},
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: `${reply.get('text')}`
						}
					});
				if (i < replies.length - 1) {
					blocks.push({
						type: 'divider'
					});
				}
			}
			return blocks;
		}
		return undefined;
	}

	async createMarkerMarkup (codemark) {
		let markers;
		let markerMarkdown = '';
		if (codemark.get('markerIds') && codemark.get('markerIds').length) {
			markers = await this.data.markers.getByIds(codemark.get('markerIds'));
			if (markers && markers.length) {
				markerMarkdown += '\n';
				for (const m of markers) {
					markerMarkdown += `\n${m.get('file')}\n\`\`\`${m.get('code')}}\`\`\``;
				}
			}
		}
		return markerMarkdown;
	}

	async getUsers () {
		// this assumes 2 possible users
		// userThatCreated: user that created the post
		// userThatClicked: user that clicked on the post
		// it's possible that they're the same user

		let results = {};
		let found = false;
		// if the user that created is the same as the user that clicked, we only need 1 lookup
		if (this.actionPayload.pcuId === this.payload.user.id) {
			let user = await this.getCodeStreamUser(this.actionPayload.crId);
			if (user) {
				const accessToken = this.getAccessToken(user, this.actionPayload.tId, this.payload.user.team_id);
				if (accessToken) {
					results.userThatCreated = user;
					results.userThatClicked = user;
					found = true;
				}
			}
			else {
				this.log(`could not find user crId=${this.actionPayload.crId}`);
			}
		}
		if (!found) {
			const users = await Promise.all([
				// user that created the post (codestream userId)
				this.actionPayload.crId
					? new Promise(async resolve => {
						resolve(await this.getCodeStreamUser(this.actionPayload.crId));
					})
					: undefined,
				//user that clicked on the button
				this.payload.user.id
					? new Promise(async resolve => {
						resolve(await this.getUser(this.payload.user.id));
					})
					: undefined
			]);
			results.userThatCreated = users[0];
			results.userThatClicked = users[1];
			if (results.userThatClicked && results.userThatClicked.get('externalUserId')) {
				results.userThatClickedIsFauxUser = true;
			}
			if (results.userThatCreated && !results.userThatClicked) {
				// didn't find a user that clicked on the post... do we have a faux user for them?
				const fauxUser = await this.getFauxUser(this.actionPayload.tId, this.payload.user.team_id, this.payload.user.id);
				if (fauxUser) {
					results.userThatClicked = fauxUser;
					results.userThatClickedIsFauxUser = true;
					return results;
				}

				// if we still don't have a user that clicked, 
				// see if we can map the user that clicked by email address to someone already in codestream
				try {
					const accessToken = this.getAccessToken(results.userThatCreated, this.actionPayload.tId, this.payload.user.team_id);
					if (accessToken) {
						const slackUser = await this.getUserFromSlack(this.payload.user.id, accessToken);
						if (slackUser) {
							const userThatClicked = slackUser.user && slackUser.user.profile && await this.getUserByEmail(slackUser.user.profile.email);
							if (userThatClicked) {
								results.userThatClicked = userThatClicked;
							}
						}
					}
				}
				catch (ex) {
					this.log(ex.message);
				}
			}
		}

		return results;
	}

	getAccessToken (user, codestreamTeamId, slackWorkspaceId) {
		if (!user) return undefined;
		const slackProviderInfo = user.get('providerInfo')[codestreamTeamId].slack.multiple[slackWorkspaceId];
		if (slackProviderInfo) {
			return slackProviderInfo.accessToken;
		}
		return undefined;
	}

	async postEphemeralMessage (responseUrl, blocks, message) {
		const uri = url.parse(responseUrl);
		return new Promise(resolve => {
			post(
				uri.host,
				uri.port,
				uri.path,
				{
					text: message,
					response_type: 'ephemeral',
					replace_original: false,
					blocks: blocks
				},
				null,
				function (cb) {
					resolve(cb);
				}
			);
		});
	}

	formatTime (user, timeStamp, timeZone) {
		const format = 'h:mm A MMM D';
		if (!timeZone) {
			timeZone = user && user.get('timeZone');
			if (!timeZone) {
				timeZone = 'Etc/GMT';
			}
		}
		let value = MomentTimezone.tz(timeStamp, timeZone).format(format);
		if (!timeZone || timeZone === 'Etc/GMT') {
			return `${value} UTC`;
		}
		return value;
	}
}

module.exports = SlackInteractiveComponentsHandler;
