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

var injectIndex = require('inject-loader!../index');

var logger;

describe('index', function () {
  var turbineScriptId = 'turbine-script-id';
  var currentScriptSpy;
  var scriptSrc =
    'https://fake.adobeassets.com:443/launch-ENabc123-development.min.js';

  beforeEach(function () {
    window._satellite = {
      container: {
        property: {
          settings: {
            undefinedVarsReturnEmpty: true,
            ruleComponentSequencingEnabled: false
          }
        },
        company: {
          cdnAllowList: undefined
        }
      }
    };

    logger = jasmine.createSpyObj('logger', [
      'log',
      'info',
      'debug',
      'warn',
      'error',
      'deprecation'
    ]);

    if (typeof document.currentScript !== 'undefined') {
      // modern browsers
      currentScriptSpy = spyOnProperty(
        document,
        'currentScript',
        'get'
      ).and.returnValue({
        src: scriptSrc,
        getAttribute: function () {
          return scriptSrc;
        }
      });
    } else {
      // IE
      var turbineScript = document.createElement('script');
      turbineScript.id = turbineScriptId;
      turbineScript.src = scriptSrc;
      document.head.appendChild(turbineScript);
    }
  });

  afterEach(function () {
    delete window._satellite;
    delete window.__satelliteLoaded;
    window.localStorage.removeItem('com.adobe.reactor.debug');
    window.localStorage.removeItem('com.adobe.reactor.hideActivity');
    if (document.getElementById(turbineScriptId)) {
      var node = document.getElementById(turbineScriptId);
      node.parentNode.removeChild(node);
    }
  });

  it('starts up just fine when container.company.cdnAllowList is undefined', function () {
    expect(function () {
      injectIndex({
        './logger': logger
      });
    }).not.toThrow();

    expect(logger.warn).not.toHaveBeenCalledWith(
      'Please review the following error:'
    );
  });

  it('exports the window._satellite object', function () {
    var index = injectIndex();
    expect(index).toBe(window._satellite);
  });

  it('prevents turbine from executing multiple times', function () {
    var createModuleProvider = jasmine.createSpy();

    injectIndex();
    injectIndex({
      './createModuleProvider': createModuleProvider
    });

    expect(createModuleProvider).not.toHaveBeenCalled();
  });

  it('deletes the container', function () {
    injectIndex();
    expect(window._satellite.container).toBe(undefined);
  });

  it('migrates cookie data', function () {
    var migrateCookieDataSpy = jasmine.createSpy();

    var dataElements = {
      foo: {
        modulePath: 'core/foo.js',
        storageDuration: 'visitor'
      }
    };

    window._satellite.container.dataElements = dataElements;

    injectIndex({
      './dataElementSafe': {
        migrateCookieData: migrateCookieDataSpy
      }
    });

    expect(migrateCookieDataSpy).toHaveBeenCalledWith(dataElements);
  });

  it('creates moduleProvider', function () {
    var createModuleProvider = jasmine.createSpy();
    injectIndex({
      './createModuleProvider': createModuleProvider
    });

    expect(createModuleProvider).toHaveBeenCalled();
  });

  it('creates getDataElementValue', function () {
    var createGetDataElementValue = jasmine.createSpy();
    var moduleProvider = function () {};
    injectIndex({
      './createGetDataElementValue': createGetDataElementValue,
      './createModuleProvider': function () {
        return moduleProvider;
      }
    });

    expect(createGetDataElementValue).toHaveBeenCalledWith(
      moduleProvider,
      jasmine.any(Function),
      jasmine.any(Function),
      true
    );
  });

  it('creates setCustomVar', function () {
    var createSetCustomVar = jasmine.createSpy();
    injectIndex({
      './createSetCustomVar': createSetCustomVar
    });

    expect(createSetCustomVar).toHaveBeenCalledWith(jasmine.any(Object));
  });

  it('creates isVar', function () {
    var createIsVar = jasmine.createSpy();
    injectIndex({
      './createIsVar': createIsVar
    });

    expect(createIsVar).toHaveBeenCalledWith(
      jasmine.any(Object),
      jasmine.any(Function)
    );
  });

  it('creates getVar', function () {
    var createGetVar = jasmine.createSpy();
    var getDataElementValue = function () {};
    injectIndex({
      './createGetVar': createGetVar,
      './createGetDataElementValue': function () {
        return getDataElementValue;
      }
    });

    expect(createGetVar).toHaveBeenCalledWith(
      jasmine.any(Object),
      jasmine.any(Function),
      getDataElementValue
    );
  });

  it('creates replaceTokens', function () {
    var createReplaceTokens = jasmine.createSpy();
    var isVar = function () {};
    var getVar = function () {};
    injectIndex({
      './createReplaceTokens': createReplaceTokens,
      './createIsVar': function () {
        return isVar;
      },
      './createGetVar': function () {
        return getVar;
      }
    });

    expect(createReplaceTokens).toHaveBeenCalledWith(isVar, getVar, true);
  });

  it('creates namespaced storage', function () {
    var getNamespacedStorage = jasmine.createSpy().and.returnValue({
      getItem: function () {}
    });
    injectIndex({
      './getNamespacedStorage': getNamespacedStorage
    });

    expect(getNamespacedStorage).toHaveBeenCalledWith('localStorage');
  });

  it('creates namespaced storage', function () {
    var getNamespacedStorage = jasmine.createSpy().and.returnValue({
      getItem: function () {}
    });
    injectIndex({
      './getNamespacedStorage': getNamespacedStorage
    });

    expect(getNamespacedStorage).toHaveBeenCalledWith('localStorage');
  });

  it("sets logger output enabled when local storage item is 'true'", function () {
    window.localStorage.setItem('com.adobe.reactor.debug', true);

    injectIndex({
      './logger': logger
    });

    expect(logger.outputEnabled).toBe(true);
  });

  it(
    'sets logger output disabled when local storage item is anything ' +
      "other than 'true'",
    function () {
      window.localStorage.setItem('com.adobe.reactor.debug', false);

      injectIndex({
        './logger': logger
      });

      expect(logger.outputEnabled).toBe(false);
    }
  );

  it('hydrates satellite object', function () {
    var container = window._satellite.container;
    var hydrateSatelliteObject = jasmine.createSpy();
    var getVar = function () {};
    var setCustomVar = function () {};
    injectIndex({
      './hydrateSatelliteObject': hydrateSatelliteObject,
      './createGetVar': function () {
        return getVar;
      },
      './createSetCustomVar': function () {
        return setCustomVar;
      }
    });

    expect(hydrateSatelliteObject).toHaveBeenCalledWith(
      window._satellite,
      container,
      jasmine.any(Function),
      getVar,
      setCustomVar
    );
  });

  it('hydrates module provider', function () {
    var container = window._satellite.container;
    var hydrateModuleProvider = jasmine.createSpy();
    var moduleProvider = { type: 'moduleProvider' };
    var debugController = { type: 'debugController' };
    var replaceTokens = function () {};
    var getDataElementValue = function () {};
    var decorateWithDynamicHost = function () {};
    injectIndex({
      './hydrateModuleProvider': hydrateModuleProvider,
      './createModuleProvider': function () {
        return moduleProvider;
      },
      './createDebugController': function () {
        return debugController;
      },
      './createReplaceTokens': function () {
        return replaceTokens;
      },
      './createGetDataElementValue': function () {
        return getDataElementValue;
      },
      './createDynamicHostResolver': function () {
        return {
          decorateWithDynamicHost: decorateWithDynamicHost
        };
      }
    });

    expect(hydrateModuleProvider).toHaveBeenCalledWith(
      container,
      moduleProvider,
      debugController,
      replaceTokens,
      getDataElementValue,
      decorateWithDynamicHost
    );
  });

  it('initializes rules', function () {
    var rules = [];
    var initRules = jasmine.createSpy();
    var buildRuleExecutionOrder = function () {};
    var initEventModule = function () {};
    injectIndex({
      './rules/initRules': initRules,
      './buildRuleExecutionOrder': buildRuleExecutionOrder,
      './rules/createInitEventModule': function () {
        return initEventModule;
      }
    });

    expect(initRules).toHaveBeenCalledWith(
      buildRuleExecutionOrder,
      rules,
      initEventModule
    );
  });

  it("provides an empty array for rules when container doesn't have rules", function () {
    delete window._satellite.container.rules;
    var rules;
    injectIndex({
      './rules/initRules': function (_satellite, _rules) {
        rules = _rules;
      }
    });

    expect(rules).toEqual([]);
  });

  describe('getDataElementDefinition', function () {
    it('returns data elements from container', function () {
      var dataElementDefinition = {};
      window._satellite.container.dataElements = {
        foo: dataElementDefinition
      };
      var getDataElementDefinition;
      injectIndex({
        './createIsVar': function (customVars, _getDataElementDefinition) {
          getDataElementDefinition = _getDataElementDefinition;
          return function () {};
        }
      });

      expect(getDataElementDefinition('foo')).toBe(dataElementDefinition);
    });

    it("doesn't throw an error when container doesn't have data elements", function () {
      delete window._satellite.container.dataElements;
      var getDataElementDefinition;
      injectIndex({
        './createIsVar': function (customVars, _getDataElementDefinition) {
          getDataElementDefinition = _getDataElementDefinition;
          return function () {};
        }
      });

      expect(getDataElementDefinition('foo')).toBe(undefined);
    });
  });

  describe('setDebugOutputEnabled', function () {
    it('sets localStorage item', function () {
      var setOutputDebugEnabled;
      injectIndex({
        './hydrateSatelliteObject': function (
          _satellite,
          container,
          _setOutputDebugEnabled
        ) {
          setOutputDebugEnabled = _setOutputDebugEnabled;
        }
      });

      setOutputDebugEnabled(true);

      expect(window.localStorage.getItem('com.adobe.reactor.debug')).toBe(
        'true'
      );
    });
  });

  describe('dynamic host', function () {
    describe('prompts the user to see the thrown error when', function () {
      describe('there is not a proper turbineEmbedCode', function () {
        beforeEach(function () {
          if (typeof document.currentScript !== 'undefined') {
            // modern browsers
            currentScriptSpy.and.returnValue({
              src: null,
              getAttribute: function () {
                return null;
              }
            });
          }
          if (document.getElementById(turbineScriptId)) {
            // IE. Remove to flag there's no found turbine script
            var node = document.getElementById(turbineScriptId);
            node.parentNode.removeChild(node);
          }
        });

        it('the approved hosts list is empty', function () {
          window._satellite.container.company.cdnAllowList = [];

          expect(function () {
            injectIndex({
              './logger': logger
            });
          }).toThrowError(
            'Unable to find the Library Embed Code for Dynamic Host Resolution.'
          );

          expect(logger.warn).toHaveBeenCalledWith(
            'Please review the following error:'
          );
        });
      });

      describe('there is a proper turbineEmbedCode', function () {
        it('the approved hosts list is empty', function () {
          window._satellite.container.company.cdnAllowList = [];

          expect(function () {
            injectIndex({
              './logger': logger
            });
          }).toThrowError(
            'This library is not authorized for this domain. ' +
              'Please contact your CSM for more information.'
          );

          expect(logger.warn).toHaveBeenCalledWith(
            'Please review the following error:'
          );
        });

        it('the turbine embed code is not in the list of approved hosts', function () {
          window._satellite.container.company.cdnAllowList = [
            'first.domain.com',
            'second.domain.com'
          ];

          expect(function () {
            injectIndex({
              './logger': logger
            });
          }).toThrowError(
            'This library is not authorized for this domain. ' +
              'Please contact your CSM for more information.'
          );

          expect(logger.warn).toHaveBeenCalledWith(
            'Please review the following error:'
          );
        });
      });
    });
  });
});
