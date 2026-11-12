// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-junit-reporter'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    // Keep the CI command unchanged; only isolated runners opt out of the sandbox.
    customLaunchers: process.env.KARMA_NO_SANDBOX === 'true' ? {
      ChromeHeadless: {
        base: 'Chrome',
        flags: ['--headless', '--disable-gpu', '--remote-debugging-port=0', '--no-sandbox']
      }
    } : {},
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../coverage'),
      reports: ['html', 'lcovonly', 'json-summary'],
      fixWebpackSourcePaths: true,
      thresholds: require('../coverage-thresholds.json')
    },
    reporters: ['progress', 'kjhtml', 'junit'],
    junitReporter: {
      outputDir: require('path').join(__dirname, '../test-results/unit'),
      outputFile: 'junit.xml',
      useBrowserName: false
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false
  });
};
