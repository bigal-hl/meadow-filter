const chai = require('chai');
const expect = chai.expect;
const ToughCookie = require('tough-cookie');

const apiSettings = require('./api-settings.js');
const { buildClient } = require('./client.js');

const apiUrl = apiSettings.APIServerURL;
const cookieJar = new ToughCookie.CookieJar();
const api = buildClient(apiUrl, cookieJar);

suite('Method test', async () =>
{
  test('Check Sort', async () => {
    // check: sort the filtered documents and then return the pagination results back: 0th matches 10th record
		await api.post('Authenticate', { json: { UserName: apiSettings.UserName, Password: apiSettings.Password } });
		const fbjvFilter = 'FBJV~FormDataJson,Header.SampleMaterial~EQ~Profile Testing';
		const fsjfFilter = 'FSJF~FormDataJson,Header.SampleMaterial~DESC~0';

		const firstTwentyQuery = `Documents/FilteredTo/${fbjvFilter}~${fsjfFilter}/0/20`;
		const tenToTwentyQuery = `Documents/FilteredTo/${fbjvFilter}~${fsjfFilter}/10/10`;

		const firstTwentyResult = await api.get(firstTwentyQuery);
		const tenToTwentyResult = await api.get(tenToTwentyQuery);
		expect(tenToTwentyResult.body[0]['IDDocument']).to.deep.equal(firstTwentyResult.body[10]['IDDocument']);
	});
});