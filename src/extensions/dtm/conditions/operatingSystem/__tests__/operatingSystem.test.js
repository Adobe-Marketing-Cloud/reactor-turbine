'use strict';

var mockClientInfo = {
  os: 'Foo'
};

var conditionDelegateInjector = require('inject!../operatingSystem');
var conditionDelegate = conditionDelegateInjector({
  clientInfo: mockClientInfo
});

describe('operating system condition delegate', function() {
  it('returns true when the current OS matches one of the selected OSs', function() {
    var config = {
      conditionConfig: {
        operatingSystems: ['Shoe', 'Goo', 'Foo', 'Moo']
      }
    };

    expect(conditionDelegate(config)).toBe(true);
  });

  it('returns false when the current OS does not match any of the selected OSs', function() {
    var config = {
      conditionConfig: {
        operatingSystems: ['Shoe', 'Goo', 'Boo', 'Moo']
      }
    };

    expect(conditionDelegate(config)).toBe(false);
  });
});
