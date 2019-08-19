// provide middleware to receive a version header from all requests and establish an API version
// to which the request is targeted

'use strict';

const APIServerModule = require(process.env.CS_API_TOP + '/lib/api_server/api_server_module.js');
const ErrorHandler = require(process.env.CS_API_TOP + '/server_utils/error_handler');
const Errors = require('./errors');
const VersionInfo = require('./version_info');
const ReadPackageJson = require('read-package-json');

const ROUTES = [
	{
		method: 'get',
		path: '/no-auth/version',
		requestClass: require('./version_request')
	},
	{
		method: 'put',
		path: '/no-auth/--put-mock-version',
		func: 'handleMockVersion'
	}
];

class Versioner extends APIServerModule {

	constructor (options) {
		super(options);
		this.errorHandler = new ErrorHandler(Errors);
		this.versionInfo = new VersionInfo({
			api: this.api,
			data: this.api.data
		});
	}

	getRoutes () {
		return ROUTES;
	}
	
	middlewares () {
		// return a middleware function that will examine the plugin version info associated
		// with the request, and determine disposition based on our internal version information
		return async (request, response, next) => {
			try {
				await this.handleVersionCompatibility(request, response);
			}
			catch (error) {
				// can not honor the request at all, abort ASAP with 403
				request.abortWith = {
					status: this.abortWithStatusCode || 403,
					error
				};
			}
			next();
		};
	}

	// examine the request headers for plugin version information, lookup the matching
	// version information in our internal version matrix, and determine compatibility
	async handleVersionCompatibility (request, response) {

		// this is just the API server version, which we return to the client
		response.set('X-CS-API-Version', this.apiVersion);

		// determine version disposition, based on version information passed from the extension
		const versionCompatibility = await this.versionInfo.handleVersionCompatibility({
			pluginIDE: request.headers['x-cs-plugin-ide'],
			pluginVersion: request.headers['x-cs-plugin-version'],
		});
		response.set('X-CS-Version-Disposition', versionCompatibility.versionDisposition);

		// if the plugin is too old, we can not honor this request at all, but let
		// the client known what URL they can download from
		if (versionCompatibility.versionDisposition === 'incompatible') {
			this.abortWithStatusCode = 400;
			response.set('X-CS-Latest-Asset-Url', versionCompatibility.latestAssetUrl);
			throw this.errorHandler.error('versionNotSupported');
		}

		// if the plugin is unknown, no further information is available
		if (
			versionCompatibility.versionDisposition === 'unknown' ||
			versionCompatibility.versionDisposition === 'unknownIDE'
		) {
			return;
		}

		// set informative headers
		response.set('X-CS-Latest-Asset-Url', versionCompatibility.latestAssetUrl);
		response.set('X-CS-Current-Version', versionCompatibility.currentVersion);
		response.set('X-CS-Supported-Version', versionCompatibility.supportedVersion);
		response.set('X-CS-Preferred-Version', versionCompatibility.preferredVersion);

		// set informative headers regarding the agent
		if (versionCompatibility.preferredAgent) {
			response.set('X-CS-Preferred-Agent', versionCompatibility.preferredAgent);
		}
		if (versionCompatibility.supportedAgent) {
			response.set('X-CS-Supported-Agent', versionCompatibility.supportedAgent);
		}
	}

	// handle setting a mock version in the compatibility matrix, for testing
	handleMockVersion (request, response) {
		if (this.api.config.api.mockMode) {
			this.api.data.versionMatrix.create(request.body);
			response.send({});
		}
		else {
			response.status(401).send('NOT IN MOCK MODE');
		}
	}

	// initialize this module
	async initialize () {
		// read our package.json and extract the API server version,
		// which we'll return to the client on every request
		return new Promise((resolve, reject) => {
			ReadPackageJson(
				process.env.CS_API_TOP + '/package.json',
				(error, data) => {
					if (error) { reject(error); }
					this.apiVersion = data.version;
					this.api.log('API Version is ' + this.apiVersion);
					resolve();
				}
			);
		});
	}

	// describe any errors associated with this module, for help
	describeErrors () {
		return {
			'Versioner': Errors
		};
	}
}

module.exports = Versioner;
