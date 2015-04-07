window._satellite = {};

_satellite.utils = require('./utils/public/index');
_satellite.data = require('./data/public/index');
_satellite.pageBottom = require('./pageBottom');

// TODO: This will need to be more flexible to handle inclusion of only the extensions
// configured for the property.
_satellite.availableExtensions = {
  adobeAnalytics: require('./extensions/AdobeAnalytics'),
  adobeTarget: require('./extensions/AdobeTarget')
};

var createExtensionInstances = function(propertyMeta) {
  var instances = {};

  for (var extensionInstanceId in propertyMeta.extensions) {
    var extensionInstanceMeta = propertyMeta.extensions[extensionInstanceId];
    var extensionId = extensionInstanceMeta.extensionId;
    var Extension = _satellite.availableExtensions[extensionId];
    var extensionInstance = new Extension(propertyMeta, extensionInstanceMeta.settings);
    instances[extensionInstanceId] = extensionInstance;
  }

  return instances;
};

_satellite.init = function(propertyMeta) {
  _satellite.appVersion = propertyMeta.appVersion;
  _satellite.extensionInstances = createExtensionInstances(propertyMeta);
  //require('./rules/initRules')(propertyMeta);

  // TODO: Temporary for testing.
  setTimeout(function() {
    var rule = propertyMeta.newRules[3];
    rule.actions.forEach(function(action) {
      action.extensionInstanceIds.forEach(function(instanceId) {
        var instance = _satellite.extensionInstances[instanceId];
        instance[action.method](action.settings);
      });
    });
  }, 2000);
};

_satellite.init(require('./initConfig'));