// email configuration

'use strict';

module.exports = {
	sendgrid: {	// sendgrid credentials
		url: '/v3/mail/send',
		apiKey: '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',
		emailTo: process.env.CS_API_EMAIL_TO // redirect emails to this address, for safe testing
	},
	senderEmail: process.env.CS_API_SENDER_EMAIL || 'alerts@codestream.com', // we'll send emails from this address
	replyToDomain: process.env.CS_API_REPLY_TO_DOMAIN || 'dev.codestream.com',	// reply to will be like <streamId>@dev.codestream.com
	notificationInterval: process.env.CS_API_EMAIL_NOTIFICATION_INTERVAL || 300000, // how often email notifications will be sent per stream
	maxPostsPerEmail: 25,	// maximum number of posts to send in an email notification
	confirmationEmailTemplateId: '300934c5-3a9c-46f8-a905-b801c23439ab', // template to use for confirmation emails
	notificationEmailTemplateid: 'bf2b2528-08d3-43a0-a176-6f001d6e03ce', // template to use for email notifications
};
