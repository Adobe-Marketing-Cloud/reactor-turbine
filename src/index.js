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

// DYNAMIC URL
var document = require('@adobe/reactor-document');
var createDynamicHostResolver = require('./createDynamicHostResolver');
var buildRuleExecutionOrder = require('./buildRuleExecutionOrder');

var createDebugController = require('./createDebugController');
var createExecuteDelegateModule = require('./createExecuteDelegateModule');
var createGetDataElementValue = require('./createGetDataElementValue');
var createGetVar = require('./createGetVar');
var createIsVar = require('./createIsVar');
var createModuleProvider = require('./createModuleProvider');
var createNotifyMonitors = require('./createNotifyMonitors');
var createReplaceTokens = require('./createReplaceTokens');
var createSetCustomVar = require('./createSetCustomVar');

var createAddActionToQueue = require('./rules/createAddActionToQueue');
var createAddConditionToQueue = require('./rules/createAddConditionToQueue');
var createAddRuleToQueue = require('./rules/createAddRuleToQueue');
var createEvaluateConditions = require('./rules/createEvaluateConditions');
var createExecuteRule = require('./rules/createExecuteRule');
var createGetModuleDisplayNameByRuleComponent = require('./rules/createGetModuleDisplayNameByRuleComponent');
var createGetSyntheticEventMeta = require('./rules/createGetSyntheticEventMeta');
var createInitEventModule = require('./rules/createInitEventModule');
var createLogActionError = require('./rules/createLogActionError');
var createLogConditionError = require('./rules/createLogConditionError');
var createLogConditionNotMet = require('./rules/createLogConditionNotMet');
var createLogRuleCompleted = require('./rules/createLogRuleCompleted');
var createRunActions = require('./rules/createRunActions');
var createTriggerRule = require('./rules/createTriggerRule');

var getRuleComponentErrorMessage = require('./rules/getRuleComponentErrorMessage');
var isConditionMet = require('./rules/isConditionMet');
var initRules = require('./rules/initRules');
var normalizeRuleComponentError = require('./rules/normalizeRuleComponentError');
var normalizeSyntheticEvent = require('./rules/normalizeSyntheticEvent');

var dataElementSafe = require('./dataElementSafe');
var getNamespacedStorage = require('./getNamespacedStorage');

var hydrateModuleProvider = require('./hydrateModuleProvider');
var hydrateSatelliteObject = require('./hydrateSatelliteObject');
var IEGetTurbineScript = require('../temporaryHelpers/findPageScript')
  .getTurbine;

var traverseDelegateProperties = require('./traverseDelegateProperties');

var logger = require('./logger');

var _satellite = window._satellite;

if (_satellite && !window.__satelliteLoaded) {
  // If a consumer loads the library multiple times, make sure only the first time is effective.
  window.__satelliteLoaded = true;

  var container = _satellite.container;

  // Remove container in public scope ASAP so it can't be manipulated by extension or user code.
  delete _satellite.container;

  // DYNAMIC URL
  var currentScriptSource = '';
  if (document.currentScript && document.currentScript.getAttribute('src')) {
    currentScriptSource = document.currentScript.getAttribute('src');
  } else if (IEGetTurbineScript()) {
    currentScriptSource = IEGetTurbineScript().getAttribute('src');
  }
  var dynamicHostResolver;
  try {
    dynamicHostResolver = createDynamicHostResolver(
      currentScriptSource,
      container.company.cdnAllowList
    );
  } catch (e) {
    logger.warn('Please review the following error:');
    throw e; // We don't want to continue allowing Turbine to start up if we detect an error in here
  }

  window.dynamicHostResolver = dynamicHostResolver;
  console.log('added dynamic host resolver to the window');

  var undefinedVarsReturnEmpty =
    container.property.settings.undefinedVarsReturnEmpty;
  var ruleComponentSequencingEnabled =
    container.property.settings.ruleComponentSequencingEnabled;

  var dataElements = container.dataElements || {};

  // Remove when migration period has ended.
  dataElementSafe.migrateCookieData(dataElements);

  var getDataElementDefinition = function (name) {
    return dataElements[name];
  };

  var moduleProvider = createModuleProvider(
    traverseDelegateProperties,
    dynamicHostResolver.isDynamicEnforced,
    dynamicHostResolver.decorateWithDynamicHost
  );

  var replaceTokens;

  // We support data elements referencing other data elements. In order to be able to retrieve a
  // data element value, we need to be able to replace data element tokens inside its settings
  // object (which is what replaceTokens is for). In order to be able to replace data element
  // tokens inside a settings object, we need to be able to retrieve data element
  // values (which is what getDataElementValue is for). This proxy replaceTokens function solves the
  // chicken-or-the-egg problem by allowing us to provide a replaceTokens function to
  // getDataElementValue that will stand in place of the real replaceTokens function until it
  // can be created. This also means that createDataElementValue should not call the proxy
  // replaceTokens function until after the real replaceTokens has been created.
  var proxyReplaceTokens = function () {
    return replaceTokens.apply(null, arguments);
  };

  var getDataElementValue = createGetDataElementValue(
    moduleProvider,
    getDataElementDefinition,
    proxyReplaceTokens,
    undefinedVarsReturnEmpty
  );

  var customVars = {};
  var setCustomVar = createSetCustomVar(customVars);

  var isVar = createIsVar(customVars, getDataElementDefinition);

  var getVar = createGetVar(
    customVars,
    getDataElementDefinition,
    getDataElementValue
  );

  replaceTokens = createReplaceTokens(isVar, getVar, undefinedVarsReturnEmpty);

  var localStorage = getNamespacedStorage('localStorage');
  var debugController = createDebugController(localStorage, logger);

  // Important to hydrate satellite object before we hydrate the module provider or init rules.
  // When we hydrate module provider, we also execute extension code which may be
  // accessing _satellite.
  hydrateSatelliteObject(
    _satellite,
    container,
    debugController.setDebugEnabled,
    getVar,
    setCustomVar
  );

  hydrateModuleProvider(
    container,
    moduleProvider,
    debugController,
    replaceTokens,
    getDataElementValue,
    dynamicHostResolver.decorateWithDynamicHost
  );

  var notifyMonitors = createNotifyMonitors(_satellite);
  var executeDelegateModule = createExecuteDelegateModule(
    moduleProvider,
    replaceTokens
  );

  var getModuleDisplayNameByRuleComponent = createGetModuleDisplayNameByRuleComponent(
    moduleProvider
  );
  var logConditionNotMet = createLogConditionNotMet(
    getModuleDisplayNameByRuleComponent,
    logger,
    notifyMonitors
  );
  var logConditionError = createLogConditionError(
    getRuleComponentErrorMessage,
    getModuleDisplayNameByRuleComponent,
    logger,
    notifyMonitors
  );
  var logActionError = createLogActionError(
    getRuleComponentErrorMessage,
    getModuleDisplayNameByRuleComponent,
    logger,
    notifyMonitors
  );
  var logRuleCompleted = createLogRuleCompleted(logger, notifyMonitors);

  var evaluateConditions = createEvaluateConditions(
    executeDelegateModule,
    isConditionMet,
    logConditionNotMet,
    logConditionError
  );
  var runActions = createRunActions(
    executeDelegateModule,
    logActionError,
    logRuleCompleted
  );
  var executeRule = createExecuteRule(evaluateConditions, runActions);

  var addConditionToQueue = createAddConditionToQueue(
    executeDelegateModule,
    normalizeRuleComponentError,
    isConditionMet,
    logConditionError,
    logConditionNotMet
  );
  var addActionToQueue = createAddActionToQueue(
    executeDelegateModule,
    normalizeRuleComponentError,
    logActionError
  );
  var addRuleToQueue = createAddRuleToQueue(
    addConditionToQueue,
    addActionToQueue,
    logRuleCompleted
  );

  var triggerRule = createTriggerRule(
    ruleComponentSequencingEnabled,
    executeRule,
    addRuleToQueue,
    notifyMonitors
  );

  var getSyntheticEventMeta = createGetSyntheticEventMeta(moduleProvider);

  var initEventModule = createInitEventModule(
    triggerRule,
    executeDelegateModule,
    normalizeSyntheticEvent,
    getRuleComponentErrorMessage,
    getSyntheticEventMeta,
    logger
  );

  initRules(buildRuleExecutionOrder, container.rules || [], initEventModule);
}

// Rollup's iife option always sets a global with whatever is exported, so we'll set the
// _satellite global with the same object it already is (we've only modified it).
module.exports = _satellite;
