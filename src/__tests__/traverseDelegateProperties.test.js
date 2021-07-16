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

var traverseDelegateProperties = require('../traverseDelegateProperties');
var pluckSettingsValue = traverseDelegateProperties.pluckSettingsValue;
var pushValueIntoSettings = traverseDelegateProperties.pushValueIntoSettings;

describe('verify pluckSettingsValue', function () {
  describe('basic input/output', function () {
    it('handles undefined', function () {
      expect(pluckSettingsValue(undefined, undefined)).toBe(undefined);
    });

    it('handles null', function () {
      expect(pluckSettingsValue(null, null)).toBe(undefined);
    });
  });

  describe('handles objects', function () {
    it('handles unknown nested paths', function () {
      var pathString = 'a.b.foobar';
      var settings = {
        a: {
          b: {
            c: 'hello'
          }
        }
      };
      expect(pluckSettingsValue(pathString, settings)).toBe(undefined);
    });

    it('handles grabbing an object from the top', function () {
      var pathString = 'a';
      var settings = {
        a: {
          b: {
            c: 'hello'
          }
        }
      };
      expect(pluckSettingsValue(pathString, settings)).toEqual(settings.a);
    });

    it('handles grabbing an object from the middle', function () {
      var pathString = 'a.b';
      var settings = {
        a: {
          b: {
            c: 'hello'
          }
        }
      };
      expect(pluckSettingsValue(pathString, settings)).toEqual(settings.a.b);
    });

    it('handles simple object nesting at the end of a chain', function () {
      var pathString = 'a.b.c';
      var settings = {
        a: {
          b: {
            c: 'hello'
          }
        }
      };
      expect(pluckSettingsValue(pathString, settings)).toBe('hello');
    });
  });

  describe('handles arrays', function () {
    it('can handle something at the beginning of an array', function () {
      var pathString = 'a[0]';
      var settings = {
        a: [1, 2, 3, 4, 5]
      };

      expect(pluckSettingsValue(pathString, settings)).toBe(1);
    });

    it('can handle something in the middle of an array', function () {
      var pathString = 'a[2]';
      var settings = {
        a: [1, 2, 3, 4, 5]
      };

      expect(pluckSettingsValue(pathString, settings)).toBe(3);
    });

    it('can handle something at the end of an array', function () {
      var pathString = 'a[4]';
      var settings = {
        a: [1, 2, 3, 4, 5]
      };

      expect(pluckSettingsValue(pathString, settings)).toBe(5);
    });

    it('can handle array out of bounds', function () {
      var pathString = 'a[100]';
      var settings = {
        a: [1, 2, 3]
      };

      expect(pluckSettingsValue(pathString, settings)).toBe(undefined);
    });

    it('can handle an array inside of an object', function () {
      var pathString = 'a.b[2]';
      var settings = {
        a: {
          b: [1, 2, 3, 4, 5]
        }
      };

      expect(pluckSettingsValue(pathString, settings)).toBe(3);
    });

    it('can handle an array inside of an object inside of an array...', function () {
      var pathString = 'a.b[2].names[1]';
      var settings = {
        a: {
          b: [
            1,
            2,
            {
              names: ['john', 'jane']
            },
            4,
            5
          ]
        }
      };

      expect(pluckSettingsValue(pathString, settings)).toBe('jane');
    });
  });
});

describe('verify pushSettingsValue', function () {
  describe('basic input/output', function () {
    it('handles undefined', function () {
      expect(pushValueIntoSettings(undefined, undefined, 'new value')).toBe(
        undefined
      );
    });

    it('handles null', function () {
      expect(pluckSettingsValue(null, null, 'new value¸')).toBe(undefined);
    });
  });

  describe('update tests', function () {
    it('can update a settings object containing one value', function () {
      var oldSettings = {
        source: '/some/relative/url'
      };

      var newSettings = pushValueIntoSettings(
        'source',
        oldSettings,
        'https://somedomain.com'
      );

      var expectedNewSettings = {
        source: 'https://somedomain.com'
      };

      expect(newSettings).toEqual(expectedNewSettings);
    });

    it('can update a settings array containing one value', function () {
      var oldSettings = {
        sources: ['0', '1', '2']
      };

      var newSettings = pushValueIntoSettings(
        'sources[1]',
        oldSettings,
        'https://somedomain.com'
      );

      var expectedNewSettings = {
        sources: ['0', 'https://somedomain.com', '2']
      };

      expect(newSettings).toEqual(expectedNewSettings);
    });

    it('can update a top level setting (array)', function () {
      var oldSettings = {
        a: {
          b: {
            value: 'foo',
            secondValue: 'world'
          },
          nestedList: ['0', '1', '2']
        },
        someList: ['a', 'b', 'c']
      };

      var newSettings = pushValueIntoSettings(
        'someList[0]',
        oldSettings,
        'bar-boo'
      );

      var expectedNewSettings = {
        a: {
          b: {
            value: 'foo',
            secondValue: 'world'
          },
          nestedList: ['0', '1', '2']
        },
        someList: ['bar-boo', 'b', 'c']
      };

      expect(newSettings).toEqual(expectedNewSettings);
    });

    it('can update a top level setting (object)', function () {
      var oldSettings = {
        a: {
          b: {
            value: 'foo',
            secondValue: 'world'
          },
          nestedList: ['0', '1', '2']
        },
        someList: ['a', 'b', 'c'],
        topValue: 'foo-boo'
      };

      var newSettings = pushValueIntoSettings(
        'topValue',
        oldSettings,
        'bar-boo'
      );

      var expectedNewSettings = {
        a: {
          b: {
            value: 'foo',
            secondValue: 'world'
          },
          nestedList: ['0', '1', '2']
        },
        someList: ['a', 'b', 'c'],
        topValue: 'bar-boo'
      };

      expect(newSettings).toEqual(expectedNewSettings);
    });

    it('pushes down into a list in the middle of settings', function () {
      var oldSettings = {
        a: {
          b: {
            value: 'foo',
            secondValue: 'world'
          },
          nestedList: ['0', '1', '2']
        },
        someList: ['a', 'b', 'c']
      };

      var newSettings = pushValueIntoSettings(
        'a.nestedList[0]',
        oldSettings,
        'bar'
      );

      var expectedNewSettings = {
        a: {
          b: {
            value: 'foo',
            secondValue: 'world'
          },
          nestedList: ['bar', '1', '2']
        },
        someList: ['a', 'b', 'c']
      };

      expect(newSettings).toEqual(expectedNewSettings);
    });

    it('pushes down into an object in the middle of settings', function () {
      var oldSettings = {
        a: {
          b: {
            value: 'foo',
            secondValue: 'world'
          }
        },
        someList: ['a', 'b', 'c']
      };

      var newSettings = pushValueIntoSettings('a.b.value', oldSettings, 'bar');

      var expectedNewSettings = {
        a: {
          b: {
            value: 'bar',
            secondValue: 'world'
          }
        },
        someList: ['a', 'b', 'c']
      };

      expect(newSettings).toEqual(expectedNewSettings);
    });

    it('pushes down into a complicated settings', function () {
      var oldSettings = {
        a: {
          b: [
            0,
            1,
            {
              url: '/some/relative/url',
              foo: 'bar'
            }
          ],
          c: {
            hello: 'world'
          }
        },
        d: ['some', 'things', 'here']
      };

      var newSettings = pushValueIntoSettings(
        'a.b[2].url',
        oldSettings,
        'https://new-url'
      );

      var expectedNewSettings = {
        a: {
          b: [
            0,
            1,
            {
              url: 'https://new-url',
              foo: 'bar'
            }
          ],
          c: {
            hello: 'world'
          }
        },
        d: ['some', 'things', 'here']
      };

      expect(newSettings).toEqual(expectedNewSettings);
    });
  });
});
