/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

'use strict';

var createExecuteRule = require('../createExecuteRule');
var rule = { id: 'rule id' };
var normalizedSyntheticEvent = { $type: 'some type' };

describe('createExecuteRule returns a function that when called', function () {
  it('executes runActions if conditions are returning true', function () {
    var evaluateConditionsSpy = jasmine
      .createSpy('evaluateConditions')
      .and.returnValue(true);
    var runActionsSpy = jasmine.createSpy('runActions');

    createExecuteRule(evaluateConditionsSpy, runActionsSpy)(
      rule,
      normalizedSyntheticEvent
    );

    expect(evaluateConditionsSpy).toHaveBeenCalledWith(
      { id: 'rule id' },
      { $type: 'some type' }
    );

    expect(runActionsSpy).toHaveBeenCalledWith(
      { id: 'rule id' },
      { $type: 'some type' }
    );
  });

  it('does not execute runActions if conditions are returning false', function () {
    var evaluateConditions = function () {
      return false;
    };
    var runActionsSpy = jasmine.createSpy('runActions');

    createExecuteRule(evaluateConditions, runActionsSpy)(
      rule,
      normalizedSyntheticEvent
    );

    expect(runActionsSpy).not.toHaveBeenCalled();
  });
});
