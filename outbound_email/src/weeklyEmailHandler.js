'use strict';

const WeeklyEmailPerUserHandler = require('./weeklyEmailPerUserHandler');
const Fetch = require('node-fetch');

const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;

class WeeklyEmailHandler {

	constructor (options) {
		this.handlerOptions = options;
		Object.assign(this, options);
		this.logger = this.logger || console;
	}

	async handleMessage (message) {
		this.message = message;
		this.log(`Processing a weekly email request: ${JSON.stringify(this.message)}`);
		this.processingStartedAt = Date.now();
		try {
			if (!await this.getTeam()) {			// get the team for whom to send out weekly emails
				return; 
			}
			if (!await this.getUsers()) {			// get users on the team
				return;
			}
			await this.readLatestNews();
			await this.sendEmailsToUsers();			// send emails to each user on the team
		}
		catch (error) {
			let message;
			if (error instanceof Error) {
				message = `${error.message}\n${error.stack}`;
			}
			else {
				message = JSON.stringify(error);
			}
			return this.warn(`Weekly email handling failed: ${message}`);
		}
		this.log(`Successfully processed a weekly email request: ${JSON.stringify(this.message)}`);
	}

	// get the team for whom to send out weekly emails to all relevant users, and check for eligibility
	async getTeam () {
		this.teamData = {};
		const team = this.teamData.team = await this.data.teams.getById(this.message.teamId);
		if (!team) {
			this.warn(`Team not found: ${this.message.teamId}`);
			return;
		}
		this.teamData.company = await this.data.companies.getById(team.companyId);
		if (!this.teamData.company) {
			this.warn(`Company not found: ${team.companyId}`);
		}
		
		// check for deactivate or inactive teams
		const threeWeeksAgo = Date.now() - 3 * ONE_WEEK;
		if (team.deactivated) {
			this.log(`Not doing weekly email reminders for team ${team.id}, team has been deactivated`);
			return false;
		} else if (team.lastPostCreatedAt < threeWeeksAgo && team.weeklyEmailRunCount === 0) {
			this.log(`Not doing weekly email reminders to team ${team.id}, team has not had any activity in the last three weeks, and their email run count is at 0`);
			return false;
		}

		return true;
	}

	// get all users on the team, and check for eligibility
	async getUsers () {
		const { team } = this.teamData;

		// get all members, this includes removed members who might still have authored something
		const memberIds = team.memberIds || [];
		if (memberIds.length === 0) {
			this.log(`Not triggering weekly email reminders for team ${team.id}, team has no members`);
			return false;
		}
		const users = this.teamData.users = await this.data.users.getByIds(memberIds);

		// determine which of these team members are actually eligible to receive weekly emails
		this.eligibleUsers = users.filter(user => {
			return this.userIsEligible(user, team)
		});
		if (this.eligibleUsers.length > 0) {
			return true;
		} else {
			this.log('No users are eligible to receive weekly emails for this run');
			return false;
		}
	}

	// get the "latest news" html from github pages
	async readLatestNews () {
		const response = await Fetch('https://teamcodestream.github.io/latest-news/latestNews.html');
		if (!response.ok) {
			this.warn(`Unable to read latest news, status code ${response.status}: ${response.statusText}`);
			this.latestNews = '';
		} else {
			this.latestNews = await response.text();
		}
	}

	// check if a given user is eligible to receive a weekly email
	userIsEligible (user, team) {
		const lastEmailSentAt = (user.lastWeeklyEmailSentAt || {})[team.id] || 0;
		if (user._forTesting) {
			this.log(`User ${user.id} is a test user, so will not receive a weekly email`);
			return false;
		} else if (user.deactivated) {
			this.log(`User ${user.id} has been deactivated so will not receive a weekly email`);
			return false;
		} else if (user.externalUserId) {
			this.log(`User ${user.id} has an external user ID so will not receive a weekly email`);
			return false;
		} else if ((team.removedMemberIds || []).includes(user.id)) {
			// NOTE: this will not preclude the user receiving an email for another team, when that team runs
			this.log(`User ${user.id} has been removed from team ${team.id} so will not receive a weekly email for this team`);
			return false;
		} else if ((team.foreignMemberIds || []).includes(user.id)) {
			// NOTE: this will not preclude the user receiving an email for another team, when that team runs
			this.log(`User ${user.id} is foreign to team ${team.id} so will not receive a weekly email for this team`);
			return false;
		} else if (lastEmailSentAt > Date.now() - this.message.userCutoffTime) {
			this.log(`User ${user.id}:${user.email} has received a weekly email within ${this.message.userCutoffTime}ms, so will not receive another`);
			return false;
		} else if ((user.preferences || {}).weeklyEmailDelivery === false) {
			this.log(`User ${user.id} has opted out of weekly emails`);
			return false;
		} else if ((user.teamIds || []).length === 0) {
			this.log(`User ${user.id} is not on any teams so will not receive a weekly email`);
			return false;
		}
		return true;
	}

	// send weekly emails to all users on the team that are eligible
	async sendEmailsToUsers () {
		// note that users can be on multiple teams, so basically the first team that gets queued for weekly emails,
		// for which a given user is an active member, will "win the race" ... but the email itself shows activity 
		// for all the active teams the user is on
		for (let i = 0; i < this.eligibleUsers.length; i++) {
			await this.sendEmailToUser(this.eligibleUsers[i]);
			this.log(`Waiting ${this.message.userThrottleTime} for next user...`);
			await this.wait(this.message.userThrottleTime);	// throttle sending these emails so as not to overwhelm
		}
	}

	// send a weekly email to one user on the team
	async sendEmailToUser (user) {
		await new WeeklyEmailPerUserHandler(Object.assign({}, this.handlerOptions, {
			teamData: this.teamData,
			logger: this.logger,
			latestNews: this.latestNews
		})).sendEmailToUser(user);
	}

	// wait this number of milliseconds
	async wait (time) {
		return new Promise(resolve => {
			setTimeout(resolve, time);
		});
	}

	log (msg) {
		this.logger.log(msg, this.requestId);
	}

	warn (msg) {
		this.logger.warn(msg, this.requestId);
	}
}

module.exports = WeeklyEmailHandler;