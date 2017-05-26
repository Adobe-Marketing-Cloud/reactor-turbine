/***************************************************************************************
 * (c) 2017 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 ****************************************************************************************/

var dataElementSafe = require('./dataElementSafe');
var moduleProvider = require('./moduleProvider');
var getLocalStorageItem = require('./getLocalStorageItem');
var setLocalStorageItem = require('./setLocalStorageItem');
var createGetSharedModuleExports = require('./createGetSharedModuleExports');
var createGetHostedLibFileUrl = require('./createGetHostedLibFileUrl');
var resolveRelativePath = require('./resolveRelativePath');
var logger = require('./logger');

var HIDE_ACTIVITY_LOCAL_STORAGE_NAME = 'sdsat_hide_activity';
var DEBUG_LOCAL_STORAGE_NAME = 'sdsat_debug';

var customVars = {};

// Initialize immediately in case init isn't called (which occurs in tests that
// essentially use state.js as a stub but never call init).
var rules = [];
var dataElements = {};
var buildInfo = {};
var propertySettings = {};

var init = function(container) {
  // These can't be required at the top of the file because they require other modules which require
  // state. This circular dependency would cause issues. Maybe there's a better way?
  var createGetExtensionSettings = require('./createGetExtensionSettings');
  var createPublicRequire = require('./createPublicRequire');

  rules = container.rules || rules;
  dataElements = container.dataElements || dataElements;
  buildInfo = container.buildInfo || buildInfo;
  propertySettings = container.propertySettings || propertySettings;

  var extensions = container.extensions;
  if (extensions) {
    var getSharedModuleExports = createGetSharedModuleExports(extensions, moduleProvider);

    Object.keys(extensions).forEach(function(extensionName) {
      var extension = extensions[extensionName];
      var getExtensionSettings = createGetExtensionSettings(extension.settings);

      if (extension.modules) {
        Object.keys(extension.modules).forEach(function(referencePath) {
          var getModuleExportsByRelativePath = function(relativePath) {
            var resolvedReferencePath = resolveRelativePath(referencePath, relativePath);
            return moduleProvider.getModuleExports(resolvedReferencePath);
          };

          var publicRequire = createPublicRequire({
            logger: logger.createPrefixedLogger(extension.displayName),
            buildInfo: buildInfo,
            propertySettings: propertySettings,
            getExtensionSettings: getExtensionSettings,
            getSharedModuleExports: getSharedModuleExports,
            getModuleExportsByRelativePath: getModuleExportsByRelativePath,
            getHostedLibFileUrl: createGetHostedLibFileUrl(extension.hostedLibFilesBaseUrl)
          });

          var module = extension.modules[referencePath];

          moduleProvider.registerModule(referencePath, module, publicRequire);
        });
      }
    });

    // We want to extract the module exports immediately to allow the modules
    // to run some logic immediately.
    // We need to do the extraction here in order for the moduleProvider to
    // have all the modules previously registered. (eg. when moduleA needs moduleB, both modules
    // must exist inside moduleProvider).
    moduleProvider.hydrateCache();
  }
};

var getRules = function() {
  return rules;
};

var getDataElementDefinition = function(name) {
  return dataElements[name];
};

var getShouldExecuteActions = function() {
  return getLocalStorageItem(HIDE_ACTIVITY_LOCAL_STORAGE_NAME) !== 'true';
};

var getDebugOutputEnabled = function() {
  return getLocalStorageItem(DEBUG_LOCAL_STORAGE_NAME) === 'true';
};

var setDebugOutputEnabled = function(value) {
  setLocalStorageItem(DEBUG_LOCAL_STORAGE_NAME, value);
};

var getPropertySettings = function() {
  // Intentionally does not support data element token replacements because how data element
  // tokens are replaced depends on certain property settings which creates a chicken-and-egg
  // problem.
  return propertySettings;
};

var getBuildInfo = function() {
  return buildInfo;
};

module.exports = {
  init: init,
  customVars: customVars,
  getModuleDefinition: moduleProvider.getModuleDefinition,
  getModuleExports: moduleProvider.getModuleExports,
  getRules: getRules,
  getDataElementDefinition: getDataElementDefinition,
  getShouldExecuteActions: getShouldExecuteActions,
  getDebugOutputEnabled: getDebugOutputEnabled,
  setDebugOutputEnabled: setDebugOutputEnabled,
  getCachedDataElementValue: dataElementSafe.getValue,
  cacheDataElementValue: dataElementSafe.setValue,
  getPropertySettings: getPropertySettings,
  getBuildInfo: getBuildInfo
};
