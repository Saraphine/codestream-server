// handle unit tests for the "DELETE /code-errors/:id" request to delete a code error

'use strict';

const DeleteCodeErrorTest = require('./delete_code_error_test');
const DeleteCodeErrorFetchTest = require('./delete_code_error_fetch_test');
const ACLTest = require('./acl_test');
const ACLTeamTest = require('./acl_team_test');
const CodeErrorNotFoundTest = require('./code_error_not_found_test');
const AlreadyDeletedTest = require('./already_deleted_test');
const AdminCanDeleteTest = require('./admin_can_delete_test');
const MessageTest = require('./message_test');
const DeleteRepliesTest = require('./delete_replies_test');
const DeleteClaimedTest = require('./delete_claimed_test');
const NoDeleteUnclaimedTest = require('./no_delete_unclaimed_test');
const NoDeleteClaimedByOtherTeamTest = require('./no_delete_claimed_by_other_team_test');

class DeleteCodeErrorRequestTester {

	test () {
		new DeleteCodeErrorTest().test();
		new DeleteCodeErrorFetchTest().test();
		new ACLTest().test();
		new ACLTeamTest().test();
		new CodeErrorNotFoundTest().test();
		new AlreadyDeletedTest().test();
		new AdminCanDeleteTest().test();
		new MessageTest().test();
		new DeleteRepliesTest().test();
		new DeleteClaimedTest().test();
		new NoDeleteUnclaimedTest().test();
		new NoDeleteClaimedByOtherTeamTest().test();
	}
}

module.exports = new DeleteCodeErrorRequestTester();
