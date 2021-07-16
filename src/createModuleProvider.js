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

var objectAssign = require('@adobe/reactor-object-assign');
var extractModuleExports = require('./extractModuleExports');
var logger = require('./logger');

module.exports = function (
  traverseDelegateProperties,
  isDynamicEnforced,
  decorateWithDynamicHost
) {
  var moduleByReferencePath = {};

  var getModule = function (referencePath) {
    var module = moduleByReferencePath[referencePath];

    if (!module) {
      throw new Error('Module ' + referencePath + ' not found.');
    }

    return module;
  };

  var registerModule = function (
    referencePath,
    moduleDefinition,
    extensionName,
    require,
    turbine
  ) {
    var module = {
      definition: moduleDefinition,
      extensionName: extensionName,
      require: require,
      turbine: turbine
    };
    module.require = require;
    moduleByReferencePath[referencePath] = module;
  };

  var hydrateCache = function () {
    Object.keys(moduleByReferencePath).forEach(function (referencePath) {
      try {
        getModuleExports(referencePath);
      } catch (e) {
        var errorMessage =
          'Error initializing module ' +
          referencePath +
          '. ' +
          e.message +
          (e.stack ? '\n' + e.stack : '');
        logger.error(errorMessage);
      }
    });
  };

  var getModuleExports = function (referencePath) {
    var module = getModule(referencePath);

    // Using hasOwnProperty instead of a falsey check because the module could export undefined
    // in which case we don't want to execute the module each time the exports is requested.
    if (!module.hasOwnProperty('exports')) {
      module.exports = extractModuleExports(
        module.definition.script,
        module.require,
        module.turbine
      );
    }

    return module.exports;
  };

  /**
   * Stored by reference path, holds the modules settings that need to be transformed
   * into a dynamic URL.
   * {
   *  'referencePath': {
   *     'setting.nested[4].path': 'relative-url'
   *   }
   * }
   *
   * @param settings - The settings to decorate
   * @param filePaths - The list of paths down to each setting that needs to transform
   * @param [moduleReferencePath] - If the filePaths come from a module, declare which one
   */
  var decorateSettingsWithDelegateFilePaths = function (
    settings,
    filePaths,
    moduleReferencePath
  ) {
    // nothing to do
    if (
      !isDynamicEnforced ||
      !settings ||
      !Object.keys(settings).length ||
      !Array.isArray(filePaths) ||
      !filePaths.length
    ) {
      return settings;
    }

    var settingsCopy = objectAssign({}, settings);

    // pull out the file paths by the module's reference path and loop over each urlPath
    filePaths.forEach(function (urlSettingPath) {
      // The custom code action provides the ability to have the source code in the 'source'
      // variable or to have an external file. Therefore, this module has 2 behaviors.
      // It also does not provide a value of false for isExternal just as all other extensions
      // that use fileTransform do not provide an isExternal variable check. Therefore, we need
      // to treat Adobe's custom code action special, and don't augment the 'source' variable
      // if isExternal is not also present.

      var isAdobeCustomCodeAction = Boolean(
        moduleReferencePath != null &&
          /^core\/.*actions.*\/customCode\.js$/.test(moduleReferencePath)
      );
      if (
        isAdobeCustomCodeAction &&
        urlSettingPath === 'source' &&
        !settingsCopy.isExternal
      ) {
        return;
      }

      var url = traverseDelegateProperties.pluckSettingsValue(
        urlSettingPath,
        settingsCopy
      );
      if (url) {
        // NOTE: without caching, it might be worth while to allow pushValueIntoSettings
        // to modify the passed in settings object. Leaving it for now in case we want to cache.
        settingsCopy = traverseDelegateProperties.pushValueIntoSettings(
          urlSettingPath,
          settingsCopy,
          decorateWithDynamicHost(url)
        );
      }
    });

    // return the decorated settings object
    return settingsCopy;
  };

  var getModuleDefinition = function (referencePath) {
    return getModule(referencePath).definition;
  };

  var getModuleExtensionName = function (referencePath) {
    return getModule(referencePath).extensionName;
  };

  return {
    registerModule: registerModule,
    hydrateCache: hydrateCache,
    getModuleExports: getModuleExports,
    getModuleDefinition: getModuleDefinition,
    getModuleExtensionName: getModuleExtensionName,
    decorateSettingsWithDelegateFilePaths: decorateSettingsWithDelegateFilePaths
  };
};
