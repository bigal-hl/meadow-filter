const got = require('got');
const buildClient = (prefixUrl, cookieJar) => {
	return got.extend({
		prefixUrl,
		cookieJar,
		responseType: 'json',
		https: {
			rejectUnauthorized: false,
		},
		hooks: {
			timeout: 15000,
			beforeRequest: [
				(options) => {
					const postBody = `${
						options.method === 'POST' ? `: ${JSON.stringify(options.json)}` : ''
					}`;
					console.info(
						`Going to send ${options.method} to API on URL [${options.url}]${postBody}`
					);
				},
			],
			afterResponse:
			[
				async (response, retryWithMergedOptions) =>
				{
					if (response.body && response.body.Error)
					{
						throw new Error(response.body.Error);
					}

					if (response.body && response.body.ErrorCode)
					{
						throw new Error(`Error Code: ${response.body.ErrorCode}`);
					}

					const method = response.request.options.method;
					const url = response.request.requestUrl;
					console.info(`Successfully sent ${method} to API on URL [${url}]`);
					return response;
				},
			],
			beforeError: [
				(error) => {
					const request = error.request || { options: {} };
					const method = request.options.method;
					const url = request.requestUrl;
					console.error(`Problem with ${method} to API on URL [${url}]`, {
						Code: error.response && error.response.statusCode,
						Error: error.response && error.response.body,
					});
					return error;
				},
			],
		},
	});
};

module.exports = { buildClient };
