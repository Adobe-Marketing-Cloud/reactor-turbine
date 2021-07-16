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

'use strict';

var injectHydrateModuleProvider = require('inject-loader!../hydrateModuleProvider');
var logger = require('../logger');
var createDynamicHostResolver = require('../createDynamicHostResolver');

describe('hydrateModuleProvider', function () {
  var container;
  var moduleProvider;
  var replaceTokens;
  var getDataElementValue;
  var debugController;
  var dynamicHostResolver;

  beforeEach(function () {
    container = {
      extensions: {
        'ext-a': {
          displayName: 'Extension A',
          modules: {
            'ext-a/a1.js': function () {}
          },
          settings: {},
          hostedLibFilesBaseUrl: 'somebaseurl'
        }
      },
      property: {
        settings: {}
      },
      buildInfo: {
        minified: true
      }
    };

    moduleProvider = jasmine.createSpyObj('moduleProvider', [
      'registerModule',
      'hydrateCache',
      'getModuleExports',
      'decorateSettingsWithDelegateFilePaths'
    ]);

    replaceTokens = function () {};
    getDataElementValue = function () {};
    debugController = jasmine.createSpyObj('debugController', {
      onDebugChanged: undefined,
      getDebugEnabled: true
    });

    dynamicHostResolver = createDynamicHostResolver(undefined, false, logger);
  });

  it('registers all modules', function () {
    var hydrateModuleProvider = injectHydrateModuleProvider();
    var a1Module = function () {};
    var a2Module = function () {};
    var b1Module = function () {};
    var b2Module = function () {};

    container.extensions = {
      'ext-a': {
        modules: {
          'ext-a/a1.js': a1Module,
          'ext-a/a2.js': a2Module
        }
      },
      'ext-b': {
        modules: {
          'ext-b/b1.js': b1Module,
          'ext-b/b2.js': b2Module
        }
      }
    };

    hydrateModuleProvider(
      container,
      moduleProvider,
      debugController,
      dynamicHostResolver
    );

    expect(moduleProvider.registerModule).toHaveBeenCalledWith(
      'ext-a/a1.js',
      a1Module,
      'ext-a',
      jasmine.any(Function),
      jasmine.any(Object)
    );

    expect(moduleProvider.registerModule).toHaveBeenCalledWith(
      'ext-a/a2.js',
      a2Module,
      'ext-a',
      jasmine.any(Function),
      jasmine.any(Object)
    );

    expect(moduleProvider.registerModule).toHaveBeenCalledWith(
      'ext-b/b1.js',
      b1Module,
      'ext-b',
      jasmine.any(Function),
      jasmine.any(Object)
    );

    expect(moduleProvider.registerModule).toHaveBeenCalledWith(
      'ext-b/b2.js',
      b2Module,
      'ext-b',
      jasmine.any(Function),
      jasmine.any(Object)
    );
  });

  it('hydrates module cache', function () {
    var hydrateModuleProvider = injectHydrateModuleProvider();

    hydrateModuleProvider(
      container,
      moduleProvider,
      debugController,
      dynamicHostResolver
    );

    expect(moduleProvider.hydrateCache).toHaveBeenCalled();
  });

  describe('public require provided to modules', function () {
    var publicRequire;
    var createPublicRequire;
    var getModuleExportsByRelativePath;

    beforeEach(function () {
      publicRequire = function () {};
      createPublicRequire = jasmine
        .createSpy()
        .and.callFake(function (_getModuleExportsByRelativePath) {
          getModuleExportsByRelativePath = _getModuleExportsByRelativePath;
          return publicRequire;
        });

      var hydrateModuleProvider = injectHydrateModuleProvider({
        './createPublicRequire': createPublicRequire
      });

      hydrateModuleProvider(
        container,
        moduleProvider,
        debugController,
        dynamicHostResolver
      );
    });

    it('is the publicRequire returned from createPublicRequire', function () {
      expect(moduleProvider.registerModule.calls.mostRecent().args[3]).toEqual(
        publicRequire
      );
    });

    it('was created by supplying a functional getModuleExportsByRelativePath', function () {
      expect(getModuleExportsByRelativePath).toEqual(jasmine.any(Function));

      getModuleExportsByRelativePath('./a2.js');
      expect(moduleProvider.getModuleExports).toHaveBeenCalledWith(
        'ext-a/a2.js'
      );
    });
  });

  describe('turbine object provided to modules', function () {
    var turbine;
    var createGetExtensionSettings;
    var getExtensionSettings;
    var createGetHostedLibFileUrl;
    var getHostedLibFileUrl;
    var getSharedModuleExports;
    var createGetSharedModuleExports;
    var prefixedLogger;
    var logger;

    beforeEach(function () {
      getExtensionSettings = function () {};
      createGetExtensionSettings = jasmine
        .createSpy()
        .and.callFake(function () {
          return getExtensionSettings;
        });
      getHostedLibFileUrl = function () {};
      createGetHostedLibFileUrl = jasmine.createSpy().and.callFake(function () {
        return getHostedLibFileUrl;
      });
      getSharedModuleExports = function () {};
      createGetSharedModuleExports = jasmine
        .createSpy()
        .and.callFake(function () {
          return getSharedModuleExports;
        });
      prefixedLogger = {};
      logger = {
        createPrefixedLogger: jasmine.createSpy().and.callFake(function () {
          return prefixedLogger;
        })
      };

      var hydrateModuleProvider = injectHydrateModuleProvider({
        './createGetExtensionSettings': createGetExtensionSettings,
        './createGetHostedLibFileUrl': createGetHostedLibFileUrl,
        './createGetSharedModuleExports': createGetSharedModuleExports,
        './logger': logger
      });

      hydrateModuleProvider(
        container,
        moduleProvider,
        debugController,
        replaceTokens,
        getDataElementValue,
        dynamicHostResolver
      );
      turbine = moduleProvider.registerModule.calls.mostRecent().args[4];
    });

    it('contains buildInfo', function () {
      expect(turbine.buildInfo).toBe(container.buildInfo);
    });

    it('contains getDataElementValue', function () {
      expect(turbine.getDataElementValue).toBe(getDataElementValue);
    });

    it('contains getExtensionSettings', function () {
      expect(createGetExtensionSettings).toHaveBeenCalledWith(
        replaceTokens,
        container.extensions['ext-a'].settings
      );
      expect(turbine.getExtensionSettings).toEqual(getExtensionSettings);
    });

    it('contains getHostedLibFileUrl', function () {
      expect(createGetHostedLibFileUrl).toHaveBeenCalledWith(
        dynamicHostResolver,
        'somebaseurl',
        true
      );
      expect(turbine.getHostedLibFileUrl).toEqual(getHostedLibFileUrl);
    });

    it('contains getSharedModule', function () {
      expect(createGetSharedModuleExports).toHaveBeenCalledWith(
        container.extensions,
        moduleProvider
      );
      expect(turbine.getSharedModule).toBe(getSharedModuleExports);
    });

    it('contains logger', function () {
      expect(logger.createPrefixedLogger).toHaveBeenCalledWith('Extension A');
      expect(turbine.logger).toBe(prefixedLogger);
    });

    it('contains propertySettings', function () {
      expect(turbine.propertySettings).toBe(container.property.settings);
    });

    it('contains replaceTokens', function () {
      expect(turbine.replaceTokens).toBe(replaceTokens);
    });

    it('contains onDebugChanged', function () {
      expect(turbine.onDebugChanged).toBe(debugController.onDebugChanged);
    });

    it('contains debugEnabled', function () {
      expect(turbine.debugEnabled).toBe(true);
      expect(debugController.getDebugEnabled.and.returnValue(false));
      expect(turbine.debugEnabled).toBe(false);
    });
  });

  describe('does not transform file paths', function () {
    it('when extension.filePaths is missing', function () {
      var hydrateModuleProvider = injectHydrateModuleProvider();
      var a1Module = function () {};
      var extensionA = {
        modules: {
          'ext-a/a1.js': a1Module
        },
        settings: {
          source: 'some/url'
        }
      };

      container.extensions = {
        'ext-a': extensionA
      };

      hydrateModuleProvider(
        container,
        moduleProvider,
        debugController,
        dynamicHostResolver
      );

      expect(
        moduleProvider.decorateSettingsWithDelegateFilePaths
      ).not.toHaveBeenCalled();
    });

    it('when extension.filePaths is not an array', function () {
      var hydrateModuleProvider = injectHydrateModuleProvider();
      var a1Module = function () {};
      var extensionA = {
        modules: {
          'ext-a/a1.js': a1Module
        },
        filePaths: { not: 'an array' },
        settings: {
          source: 'some/url'
        }
      };

      container.extensions = {
        'ext-a': extensionA
      };

      hydrateModuleProvider(
        container,
        moduleProvider,
        debugController,
        dynamicHostResolver
      );

      expect(
        moduleProvider.decorateSettingsWithDelegateFilePaths
      ).not.toHaveBeenCalled();
    });
  });

  it('transforms file paths when extension.filePaths is present', function () {
    var hydrateModuleProvider = injectHydrateModuleProvider();
    var a1Module = function () {};
    var extensionA = {
      modules: {
        'ext-a/a1.js': a1Module
      },
      filePaths: ['source'],
      settings: {
        source: 'some/url'
      }
    };

    container.extensions = {
      'ext-a': extensionA
    };

    hydrateModuleProvider(
      container,
      moduleProvider,
      debugController,
      dynamicHostResolver
    );

    expect(
      moduleProvider.decorateSettingsWithDelegateFilePaths
    ).toHaveBeenCalledWith(extensionA.settings, extensionA.filePaths);
  });
});
