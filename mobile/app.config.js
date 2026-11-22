const BASE_CONFIG = {
  name: 'Pizza Planner',
  slug: 'pizza-planner',
  version: '1.0.0',
  scheme: 'pizza-planner',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.dejill.pizzaplanner',
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
};

const webBasePath = process.env.WEB_BASE_PATH;

module.exports = webBasePath
  ? {
      expo: {
        ...BASE_CONFIG,
        experiments: {
          ...BASE_CONFIG.experiments,
          baseUrl: webBasePath,
        },
      },
    }
  : {
      expo: BASE_CONFIG,
    };
