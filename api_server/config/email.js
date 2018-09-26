// email configuration

'use strict';

module.exports = {
	replyToDomain: process.env.CS_API_REPLY_TO_DOMAIN || 'dev.codestream.com',	// reply to will be like <streamId>@dev.codestream.com
	notificationInterval: parseInt(process.env.CS_API_EMAIL_NOTIFICATION_INTERVAL || 300000, 10), // how often email notifications will be sent per stream
	suppressEmails: process.env.CS_API_SUPPRESS_EMAILS || true // suppress outbound email sends
};
