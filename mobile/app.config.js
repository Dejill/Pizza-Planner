const config = require('./app.json');

const webBasePath = process.env.WEB_BASE_PATH;
if (webBasePath) {
  config.expo.experiments = {
    ...config.expo.experiments,
    baseUrl: webBasePath,
  };
}

module.exports = config;
