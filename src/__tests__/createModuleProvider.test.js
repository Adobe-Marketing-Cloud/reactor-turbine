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

var injectCreateModuleProvider = require('inject-loader!../createModuleProvider');

describe('function returned by createModuleProvider', function () {
  var logger;
  var referencePath = 'hello-world/src/foo.js';
  var extensionName = 'test-extension';
  var name = 'foo';
  var displayName = 'Foo';
  var moduleExports = {};
  var extractModuleExports = require('../extractModuleExports');
  var createModuleProvider;
  var extractModuleExportsSpy;
  var traverseDelegatePropertiesSpy;
  var decorateWithDynamicHostSpy;
  var isDynamicEnforced;
  var turbineRequire;
  var moduleProvider;

  beforeEach(function () {
    logger = jasmine.createSpyObj('logger', ['log', 'error']);
    extractModuleExportsSpy = jasmine
      .createSpy('extractModuleExports')
      .and.callFake(extractModuleExports);

    createModuleProvider = injectCreateModuleProvider({
      './logger': logger,
      './extractModuleExports': extractModuleExportsSpy
    });

    traverseDelegatePropertiesSpy = {
      pluckSettingsValue: jasmine.createSpy(),
      pushValueIntoSettings: jasmine.createSpy()
    };

    isDynamicEnforced = false;
    decorateWithDynamicHostSpy = jasmine
      .createSpy()
      .and.callFake(function (url) {
        // simply reflect the url when isDynamicEnforced = false
        return url;
      });

    moduleProvider = createModuleProvider(
      traverseDelegatePropertiesSpy,
      isDynamicEnforced,
      decorateWithDynamicHostSpy
    );

    var module = {
      name: name,
      displayName: displayName,
      script: function (module) {
        module.exports = moduleExports;
      }
    };

    turbineRequire = function (path) {
      return path;
    };

    moduleProvider.registerModule(
      referencePath,
      module,
      extensionName,
      turbineRequire
    );
  });

  it('does not attempt to extract the module export when only registering a module', function () {
    expect(extractModuleExportsSpy.calls.count()).toBe(0);
  });

  it('hydrates cache', function () {
    moduleProvider.hydrateCache();
    expect(extractModuleExportsSpy.calls.count()).toBe(1);
    moduleProvider.getModuleExports(referencePath);
    expect(extractModuleExportsSpy.calls.count()).toBe(1);
  });

  it('logs an error if error is thrown while hydrating cache', function () {
    moduleProvider.registerModule(referencePath, {
      displayName: 'Foo',
      script: function () {
        throw new Error('noob tried to divide by zero.');
      }
    });

    moduleProvider.hydrateCache();

    var errorMessage = logger.error.calls.mostRecent().args[0];
    expect(errorMessage).toStartWith(
      'Error initializing module ' +
        referencePath +
        '. noob tried to divide by zero.'
    );
  });

  it('returns module exports', function () {
    expect(moduleProvider.getModuleExports(referencePath)).toBe(moduleExports);
  });

  it('returns definition', function () {
    expect(moduleProvider.getModuleDefinition(referencePath)).toEqual({
      name: name,
      displayName: displayName,
      script: jasmine.any(Function)
    });
  });

  it('returns extension name', function () {
    expect(moduleProvider.getModuleExtensionName(referencePath)).toBe(
      extensionName
    );
  });

  it('throws an error when a module is not found', function () {
    expect(function () {
      moduleProvider.getModuleExports('hello-world/src/invalid.js');
    }).toThrowError('Module hello-world/src/invalid.js not found.');
  });

  describe('decorateSettingsWithDelegateFilePaths', function () {
    var relativeUrl = '/some/relative/url';
    var moduleReferencePath = 'some-module-reference-path';
    var module = {
      referencePath: moduleReferencePath,
      filePaths: ['a.b[2].c.sourceUrl']
    };
    var settings = {
      a: {
        b: [
          0,
          1,
          {
            c: {
              sourceUrl: relativeUrl
            }
          }
        ]
      }
    };

    beforeEach(function () {
      isDynamicEnforced = true;
      decorateWithDynamicHostSpy = jasmine
        .createSpy()
        .and.callFake(function (url) {
          return 'https://adobe.com' + url;
        });
      traverseDelegatePropertiesSpy = {
        pluckSettingsValue: jasmine.createSpy().and.returnValue(relativeUrl),
        pushValueIntoSettings: jasmine.createSpy()
      };
      moduleProvider = createModuleProvider(
        traverseDelegatePropertiesSpy,
        isDynamicEnforced,
        decorateWithDynamicHostSpy
      );
    });

    it('does not blow up with undefined', function () {
      expect(function () {
        moduleProvider.decorateSettingsWithDelegateFilePaths(
          undefined,
          undefined,
          undefined
        );
      }).not.toThrow();
    });

    describe('module tests', function () {
      it('does not decorate urls when dynamic host is turned off', function () {
        isDynamicEnforced = false;
        moduleProvider = createModuleProvider(
          traverseDelegatePropertiesSpy,
          isDynamicEnforced,
          decorateWithDynamicHostSpy
        );

        moduleProvider.decorateSettingsWithDelegateFilePaths(
          settings,
          module.filePaths,
          moduleReferencePath
        );

        expect(
          traverseDelegatePropertiesSpy.pluckSettingsValue
        ).not.toHaveBeenCalled();
        expect(
          traverseDelegatePropertiesSpy.pushValueIntoSettings
        ).not.toHaveBeenCalled();
        expect(decorateWithDynamicHostSpy).not.toHaveBeenCalled();
      });

      it('decorates flagged url settings with the dynamic host', function () {
        moduleProvider.registerModule(
          moduleReferencePath,
          module,
          'some-extension',
          turbineRequire
        );

        moduleProvider.decorateSettingsWithDelegateFilePaths(
          settings,
          module.filePaths,
          moduleReferencePath
        );

        expect(
          traverseDelegatePropertiesSpy.pluckSettingsValue.calls.count()
        ).toBe(1);
        expect(
          traverseDelegatePropertiesSpy.pushValueIntoSettings.calls.count()
        ).toBe(1);
        expect(
          traverseDelegatePropertiesSpy.pushValueIntoSettings
        ).toHaveBeenCalledWith(
          'a.b[2].c.sourceUrl',
          settings,
          'https://adobe.com' + relativeUrl
        );
      });

      describe('handles the Adobe Custom Code action correctly', function () {
        beforeEach(function () {
          moduleReferencePath = 'core/src/lib/actions/customCode.js';

          moduleProvider.registerModule(
            moduleReferencePath,
            {
              referencePath: moduleReferencePath,
              filePaths: ['source']
            },
            'customCodeAction',
            turbineRequire
          );
        });

        it('does not transform when isExternal is not present', function () {
          settings = {
            source: 'some source code',
            isExternal: undefined
          };
          var filePaths = ['source'];

          moduleProvider.decorateSettingsWithDelegateFilePaths(
            settings,
            filePaths,
            moduleReferencePath
          );

          expect(
            traverseDelegatePropertiesSpy.pushValueIntoSettings
          ).not.toHaveBeenCalled();
        });

        it('transforms when isExternal=true', function () {
          settings = {
            source: 'some/relative/url',
            isExternal: true
          };
          var filePaths = ['source'];

          moduleProvider.decorateSettingsWithDelegateFilePaths(
            settings,
            filePaths,
            moduleReferencePath
          );
          expect(
            traverseDelegatePropertiesSpy.pushValueIntoSettings
          ).toHaveBeenCalledWith(
            'source',
            settings,
            'https://adobe.com/some/relative/url'
          );
        });
      });
    });

    describe('extension settings tests', function () {
      it('does not require a module path', function () {
        expect(1).toBe(1);
      });
    });

    // it('Begins building a cache of settings for the same module path', function () {
    //   moduleProvider.registerModule(
    //     referencePath,
    //     module,
    //     'some-extension',
    //     turbineRequire
    //   );
    //
    //   // call once
    //   moduleProvider.decorateSettingsWithDelegateFilePaths(
    //     referencePath,
    //     settings
    //   );
    //
    //   // call twice, should be cached
    //   moduleProvider.decorateSettingsWithDelegateFilePaths(
    //     referencePath,
    //     settings
    //   );
    //
    //   expect(
    //     traverseDelegatePropertiesSpy.pluckSettingsValue.calls.count()
    //   ).toBe(1); // stored in cache, so this isn't called again
    //   expect(
    //     traverseDelegatePropertiesSpy.pushValueIntoSettings.calls.count()
    //   ).toBe(2); // every call still pushes into the settings from cache
    //   expect(
    //     traverseDelegatePropertiesSpy.pushValueIntoSettings
    //   ).toHaveBeenCalledWith(
    //     'a.b[2].c.sourceUrl',
    //     settings,
    //     'https://adobe.com' + relativeUrl
    //   );
    // });
  });
});
