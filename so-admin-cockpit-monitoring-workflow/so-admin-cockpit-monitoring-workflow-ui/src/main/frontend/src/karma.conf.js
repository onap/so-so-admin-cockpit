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
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../coverage'),
      reports: ['html', 'lcovonly', 'json-summary'],
      fixWebpackSourcePaths: true,
      thresholds: {
        emitWarning: false,
        each: {
          overrides: {
            '**/data.service.ts': {
              lines: 100,
              functions: 100,
              statements: 100,
              branches: 100
            },
            '**/http-error-handler.service.ts': {
              lines: 100,
              functions: 100,
              statements: 100,
              branches: 83
            },
            '**/details/details.component.ts': {
              lines: 98,
              functions: 96,
              statements: 93,
              branches: 67
            },
            '**/home/home.component.ts': {
              lines: 100,
              functions: 100,
              statements: 100,
              branches: 100
            },
            '**/model/searchData.model.ts': {
              lines: 97,
              functions: 100,
              statements: 97,
              branches: 96
            },
            '**/onboard/onboard.component.ts': {
              lines: 88,
              functions: 86,
              statements: 90,
              branches: 73
            },
            '**/recipe/recipe.component.ts': {
              lines: 97,
              functions: 100,
              statements: 97,
              branches: 83
            }
          }
        }
      }
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
