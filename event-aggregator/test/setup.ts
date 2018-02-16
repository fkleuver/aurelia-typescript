  // tslint:disable
let allTestFiles: string[] = [];
let TEST_REGEXP = /^\/base\/dist\/test\/test\/(?:unit|fixtures)\/[^\/]+\.js$/i;

interface Window {
  __karma__: any;
  require: any;
}

// Get a list of all the test files to include
Object.keys(window.__karma__.files).forEach(file => {
  if (TEST_REGEXP.test(file) && file !== "/base/dist/test/test/setup.js") {
    // Normalize paths to RequireJS module names.
    // If you require sub-dependencies of test files to be loaded as-is (requiring file extension)
    // then do not normalize the paths
    const normalizedTestModule = file.replace(/^\/base\/|\.js$/g, "");
    allTestFiles.push(normalizedTestModule);
  }
});

let started = false;

window.require.config({
  // Karma serves files under /base, which is the basePath from your config file
  baseUrl: "/base",

  // we have to kickoff jasmine, as it is asynchronous
  callback: () => {
    if (started) {
      return;
    }

    started = true;
    window.require(allTestFiles, () => window.__karma__.start());
  },
  paths: {
    "aurelia-logging": "/base/node_modules/aurelia-logging/dist/amd/aurelia-logging"
  }
});
