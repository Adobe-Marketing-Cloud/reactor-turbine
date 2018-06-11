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

var injectHydrateSatelliteObject = require('inject-loader!../hydrateSatelliteObject');

describe('hydrateSatelliteObject', function() {
  var _satellite;

  var container = {
    property: {
      name: 'Test Property'
    },
    buildInfo: {}
  };

  beforeEach(function() {
    _satellite = {};
  });

  it('should add a track function on _satellite', function() {
    var hydrateSatelliteObject = injectHydrateSatelliteObject();
    hydrateSatelliteObject(_satellite, container);
    expect(_satellite.track).toEqual(jasmine.any(Function));
    // shouldn't throw an error.
    _satellite.track();
  });

  it('should add a getVisitorId function on _satellite', function() {
    var hydrateSatelliteObject = injectHydrateSatelliteObject();
    hydrateSatelliteObject(_satellite, container);
    expect(_satellite.getVisitorId).toEqual(jasmine.any(Function));
    expect(_satellite.getVisitorId()).toBe(null);
  });

  it('should add a property name on _satellite', function() {
    var hydrateSatelliteObject = injectHydrateSatelliteObject();
    hydrateSatelliteObject(_satellite, container);
    expect(_satellite.property.name).toEqual('Test Property');
  });

  it('should add setDebug function on _satellite', function() {
    var setDebugOutputEnabledSpy = jasmine.createSpy('setDebugOutputEnabled');
    var hydrateSatelliteObject = injectHydrateSatelliteObject();
    hydrateSatelliteObject(_satellite, container, setDebugOutputEnabledSpy);
    _satellite.setDebug(true);

    expect(setDebugOutputEnabledSpy).toHaveBeenCalledWith(true);
  });

  it('successfully allows setting, reading, and removing a cookie', function() {
    var logger = {
      warn: jasmine.createSpy(),
      createPrefixedLogger: function() {}
    };
    var hydrateSatelliteObject = injectHydrateSatelliteObject({
      './logger': logger
    });
    hydrateSatelliteObject(_satellite, container);

    var cookieName = 'cookiename';
    var cookieValue = 'cookievalue';

    _satellite.setCookie(cookieName, cookieValue, 91);

    expect(logger.warn).toHaveBeenCalledWith(
      '_satellite.setCookie is deprecated. Please use ' +
      '_satellite.cookie.set("cookiename", "cookievalue", { expires: 91 }).');

    expect(document.cookie.indexOf(cookieName + '=' + cookieValue)).toBeGreaterThan(-1);

    expect(_satellite.readCookie(cookieName)).toEqual('cookievalue');

    expect(logger.warn).toHaveBeenCalledWith(
      '_satellite.readCookie is deprecated. Please use _satellite.cookie.get("cookiename").');

    _satellite.removeCookie(cookieName);

    expect(logger.warn).toHaveBeenCalledWith(
      '_satellite.removeCookie is deprecated. Please use _satellite.cookie.remove("cookiename").');

    expect(document.cookie.indexOf(cookieName + '=' + cookieValue)).toBe(-1);
  });

  it('exposes npm cookie package methods', function() {
    var hydrateSatelliteObject = injectHydrateSatelliteObject();
    hydrateSatelliteObject(_satellite, container);

    expect(_satellite.cookie.get).toEqual(jasmine.any(Function));
    expect(_satellite.cookie.set).toEqual(jasmine.any(Function));
    expect(_satellite.cookie.remove).toEqual(jasmine.any(Function));
  });
  
  it('can read query parameters', function() {
	var hydrateSatelliteObject = injectHydrateSatelliteObject();
    hydrateSatelliteObject(_satellite, container);  
	  
	var oldSearch = window.location.search;
	var testString = 'foo=bar&Buzz=Fizz&spaceIncluded=space%20included';
	
	expect(_satellite.query.read("foo", undefined, testString)).toEqual("bar");
	expect(_satellite.query.read("buzz", undefined, testString)).toBeUndefined();
	expect(_satellite.query.read("Buzz", undefined, testString)).toEqual("Fizz");
	expect(_satellite.query.read("spaceIncluded", undefined, testString)).toEqual("space included");
	
	expect(_satellite.query.readCaseInsensitive("foo", testString)).toEqual("bar");
	expect(_satellite.query.readCaseInsensitive("buzz", testString)).toEqual("Fizz");
	expect(_satellite.query.readCaseInsensitive("Buzz", testString)).toEqual("Fizz");
	expect(_satellite.query.readCaseInsensitive("spaceincluded", testString)).toEqual("space included");
	
  });
  
  it('exposes querystring read methods', function() {
    var logger = {
      warn: jasmine.createSpy(),
      createPrefixedLogger: function() {}
    };
    var hydrateSatelliteObject = injectHydrateSatelliteObject({
      './logger': logger
    });
    hydrateSatelliteObject(_satellite, container);

    expect(_satellite.getQueryParam).toEqual(jasmine.any(Function));
    expect(_satellite.getQueryParamCaseInsensitive).toEqual(jasmine.any(Function));
	
	//test that deprecation warnings are issued
	_satellite.getQueryParam("queryParam");
	expect(logger.warn).toHaveBeenCalledWith(
      '_satellite.getQueryParam is deprecated. Please use _satellite.query.read("queryParam").');
	  
	 _satellite.getQueryParamCaseInsensitive("queryParam");
	expect(logger.warn).toHaveBeenCalledWith(
      '_satellite.getQueryParamCaseInsensitive is deprecated. Please use _satellite.query.readCaseInsensitive("queryParam").');
  });

  it('exposes a logger', function() {
    var hydrateSatelliteObject = injectHydrateSatelliteObject();
    hydrateSatelliteObject(_satellite, container);

    expect(_satellite.logger.log).toEqual(jasmine.any(Function));
    expect(_satellite.logger.info).toEqual(jasmine.any(Function));
    expect(_satellite.logger.warn).toEqual(jasmine.any(Function));
    expect(_satellite.logger.error).toEqual(jasmine.any(Function));
  });

  it('exposes a notify method', function() {
    var loggerMock = jasmine.createSpyObj('logger', [
      'log',
      'info',
      'warn',
      'error'
    ]);

    var hydrateSatelliteObject = injectHydrateSatelliteObject({
      './logger': {
        warn: function() {},
        log: function() {},
        info: function() {},
        error: function() {},
        createPrefixedLogger: function() {
          return loggerMock;
        }
      }
    });
    hydrateSatelliteObject(_satellite, container);

    _satellite.notify('log test');
    expect(loggerMock.log).toHaveBeenCalledWith('log test');

    _satellite.notify('log test 2', 2);
    expect(loggerMock.log).toHaveBeenCalledWith('log test 2');

    _satellite.notify('info test', 3);
    expect(loggerMock.info).toHaveBeenCalledWith('info test');

    _satellite.notify('warn test', 4);
    expect(loggerMock.warn).toHaveBeenCalledWith('warn test');

    _satellite.notify('error test', 5);
    expect(loggerMock.error).toHaveBeenCalledWith('error test');
  });

  it('exposes a pageBottom method', function() {
    var hydrateSatelliteObject = injectHydrateSatelliteObject();
    hydrateSatelliteObject(_satellite, container);
    expect(_satellite.pageBottom).toEqual(jasmine.any(Function));
    // shouldn't throw an error.
    _satellite.pageBottom();
  });

  it('exposes the container', function() {
    var logger = {
      warn: jasmine.createSpy(),
      createPrefixedLogger: function() {}
    };
    var hydrateSatelliteObject = injectHydrateSatelliteObject({
      './logger': logger
    });

    hydrateSatelliteObject(_satellite, container);

    spyOn(console, 'warn');
    expect(_satellite._container).toBe(container);
    expect(logger.warn).toHaveBeenCalledWith('_satellite._container may change at any time and ' +
      'should only be used for debugging.');
    // It shouldn't warn again.
    expect(_satellite._container).toBe(container);
    expect(logger.warn.calls.count()).toBe(1);
  });
});
