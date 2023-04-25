module.exports = {
	APIServerURL: process.env['HL_SERVER_URL'] || 'https://localhost/1.0/',
	APIServerEnforceSSL: false,
	UserName: process.env['HL_USER'] || '',
	Password: process.env['HL_PASS'] || '',
};
