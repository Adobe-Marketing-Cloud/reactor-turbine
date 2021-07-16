/***************************************************************************************
 * (c) 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 ****************************************************************************************/

var createDynamicHostResolver = require('../createDynamicHostResolver');

var consoleSpy;
var turbineEmbedCode;
var cdnAllowList;
var dynamicHostResolver;

describe('createDynamicHostResolver returns a function that when called', function () {
  beforeEach(function () {
    consoleSpy = spyOn(console, 'warn');
  });

  describe('with an undefined cdnAllowList (no decoration should be done)', function () {
    beforeEach(function () {
      cdnAllowList = undefined;
    });

    it('fails silently on creating a URL', function () {
      dynamicHostResolver = createDynamicHostResolver(
        undefined, // turbineEmbedCode
        cdnAllowList
      );

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('fails silently if there is no turbineEmbedCode', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('fails silently unknown protocols', function () {
      turbineEmbedCode = 'file://assets.adobedtm.com:8080/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('reflects back what is sent in when turbineEmbedCode is not resolved', function () {
      dynamicHostResolver = createDynamicHostResolver(
        undefined, // turbineEmbedCode
        cdnAllowList
      );

      expect(dynamicHostResolver.decorateWithDynamicHost('my-url')).toBe(
        'my-url'
      );
    });

    it('reflects back what is sent in when turbineEmbedCode is resolved', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(dynamicHostResolver.decorateWithDynamicHost('my-url')).toBe(
        'my-url'
      );
    });
  });

  describe('with an empty cdnAllowList (no domains allowed)', function () {
    beforeEach(function () {
      cdnAllowList = [];
    });

    it('throws an error when turbineEmbedCode is not defined', function () {
      expect(function () {
        createDynamicHostResolver(
          undefined, // turbineEmbedCode
          cdnAllowList
        );
      }).toThrowError(
        'Unable to find the Library Embed Code for Dynamic Host Resolution.'
      );
    });

    it(
      'it throws an error when the list is empty and there is a defined ' +
        'turbineEmbedCode',
      function () {
        expect(function () {
          createDynamicHostResolver('fake.adobeassets.com', cdnAllowList);
        }).toThrowError(
          'Unable to find the Library Embed Code for Dynamic Host Resolution.'
        );
      }
    );
  });

  describe('with a defined cdnAllowList', function () {
    beforeEach(function () {
      cdnAllowList = ['assets.adobedtm.com'];
    });

    it('logs a warning if turbineEmbedCode is not resolved', function () {
      expect(function () {
        dynamicHostResolver = createDynamicHostResolver(
          undefined, // turbineEmbedCode
          cdnAllowList
        );
      }).toThrowError(
        'Unable to find the Library Embed Code for Dynamic Host Resolution.'
      );
    });

    it('creates the resolver silently with a proper turbineEmbedCode', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('handles urls that begin with a leading slash "/my/url"', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(dynamicHostResolver.decorateWithDynamicHost('/my/url')).toBe(
        'https://assets.adobedtm.com/my/url'
      );
    });

    it('handles urls that do not have a leading slash "my/url"', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(dynamicHostResolver.decorateWithDynamicHost('my/url')).toBe(
        'https://assets.adobedtm.com/my/url'
      );
    });

    it('provides the turbineHost', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com:8080/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(dynamicHostResolver.getTurbineHost()).toBe(
        'https://assets.adobedtm.com:8080'
      );
    });

    it('upgrades to https all the time', function () {
      turbineEmbedCode = 'http://assets.adobedtm.com/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(dynamicHostResolver.decorateWithDynamicHost('my/url')).toBe(
        'https://assets.adobedtm.com/my/url'
      );
    });

    it('returns the protocol as a part of URL decoration', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com:8080/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(dynamicHostResolver.decorateWithDynamicHost('my/url')).toBe(
        'https://assets.adobedtm.com:8080/my/url'
      );
    });

    it('returns the protocol as a part of querying the turbine host', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com:8080/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(dynamicHostResolver.getTurbineHost()).toBe(
        'https://assets.adobedtm.com:8080'
      );
    });

    it('removes port 80 from the as a part of url decoration', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com:80/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(dynamicHostResolver.decorateWithDynamicHost('my/file.js')).toBe(
        'https://assets.adobedtm.com/my/file.js'
      );
    });

    it('removes port 443 from the as a part of url decoration', function () {
      turbineEmbedCode = 'https://assets.adobedtm.com:443/lib/dev.js';
      dynamicHostResolver = createDynamicHostResolver(
        turbineEmbedCode,
        cdnAllowList
      );

      expect(dynamicHostResolver.decorateWithDynamicHost('my/file.js')).toBe(
        'https://assets.adobedtm.com/my/file.js'
      );
    });

    it('will throw an error for unknown protocols', function () {
      expect(function () {
        turbineEmbedCode = 'file://assets.adobedtm.com:8080/lib/dev.js';
        dynamicHostResolver = createDynamicHostResolver(
          turbineEmbedCode,
          cdnAllowList
        );
      }).toThrowError(
        'Unable to find the Library Embed Code for Dynamic Host Resolution.'
      );
    });

    it(
      'it throws an error if the turbineEmbedCode does not fall within ' +
        'the allow list',
      function () {
        cdnAllowList = ['first.domain.com', 'second.domain.com'];

        expect(function () {
          createDynamicHostResolver(
            'https://foo-bar-domain.com:443',
            cdnAllowList
          );
        }).toThrowError(
          'This library is not authorized for this domain. ' +
            'Please contact your CSM for more information.'
        );
      }
    );
  });
});
