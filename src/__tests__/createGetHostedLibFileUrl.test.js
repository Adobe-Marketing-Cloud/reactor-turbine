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

var createGetHostedLibFileUrl = require('../createGetHostedLibFileUrl');
var createDynamicHostResolver = require('../createDynamicHostResolver');
var logger = require('../logger');

var dynamicHostResolver = createDynamicHostResolver(undefined, false, logger);

describe('function returned by createGetHostedLibFileUrl', function () {
  it('returns full hosted lib path url', function () {
    var getHostedLibFileUrl = createGetHostedLibFileUrl(
      dynamicHostResolver.decorateWithDynamicHost,
      '//example.com/',
      false
    );
    expect(getHostedLibFileUrl('file.js')).toEqual('//example.com/file.js');
  });

  describe('for a minified build', function () {
    it('returns full hosted lib path url for a file', function () {
      var getHostedLibFileUrl = createGetHostedLibFileUrl(
        dynamicHostResolver.decorateWithDynamicHost,
        '//example.com/',
        true
      );
      expect(getHostedLibFileUrl('file.js')).toEqual(
        '//example.com/file.min.js'
      );
    });

    it('returns full hosted lib path url for a file with multiple dots', function () {
      var getHostedLibFileUrl = createGetHostedLibFileUrl(
        dynamicHostResolver.decorateWithDynamicHost,
        '//example.com/',
        true
      );
      expect(getHostedLibFileUrl('file.some.js')).toEqual(
        '//example.com/file.some.min.js'
      );
    });

    it('returns full hosted lib path url for a file without extension', function () {
      var getHostedLibFileUrl = createGetHostedLibFileUrl(
        dynamicHostResolver.decorateWithDynamicHost,
        '//example.com/',
        true
      );
      expect(getHostedLibFileUrl('file')).toEqual('//example.com/file.min');
    });
  });
});
