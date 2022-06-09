// handle unit tests for the repos module

'use strict';

// make eslint happy
/* globals describe */

const ReposRequestTester = require('./repos_request_tester');
const MatchReposRequestTester = require('./match_repos/test');
const TeamLookupRequestTester = require('./team_lookup/test');
const MatchReposReadOnlyRequestTester = require('./match_repos_readonly/test');

const reposRequestTester = new ReposRequestTester();

describe('repo requests', function() {

	this.timeout(20000);

	describe('GET /repos/:id', reposRequestTester.getRepoTest);
	describe('GET /repos', reposRequestTester.getReposTest);
	describe('url normalizer', require('./normalize_url/test'));
	describe('PUT /repos/match/:teamId', MatchReposRequestTester.test);
	describe('GET /no-auth/team-lookup', TeamLookupRequestTester.test);
	describe('GET /repos/match/:teamId', MatchReposReadOnlyRequestTester.test);
});
