// provide service to handle jira credential authorization for jira server (on-prem)

'use strict';

const OAuthModule = require(process.env.CSSVC_BACKEND_ROOT + '/api_server/lib/oauth/oauth_module.js');

const OAUTH_CONFIG = {
	provider: 'jiraserver',
	host: 'jiraserver/enterprise',
	usesOauth1: true,
	requestTokenPath: 'plugins/servlet/oauth/request-token',
	authorizePath: 'plugins/servlet/oauth/authorize',
	accessTokenPath: 'plugins/servlet/oauth/access-token',
	hasIssues: true,
	forEnterprise: true,
	needsConfigure: true,
	authCompletePage: 'jira',
	noClientIdOk: true
};

class JiraServerAuth extends OAuthModule {

	constructor (config) {
		super(config);
		this.oauthConfig = OAUTH_CONFIG;
	}
}

module.exports = JiraServerAuth;
