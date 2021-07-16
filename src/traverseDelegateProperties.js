var objectAssign = require('@adobe/reactor-object-assign');

function isArrayReference(str) {
  return isString(str) && str.indexOf('[') !== -1 && str.indexOf(']') !== -1;
}
function sanitizeArrayKeyAndSplit(key) {
  var parts = key.replace('[', '.').replace(']', '').split('.');
  var arrName = parts[0];
  var arrIndex = parts[1];
  return {
    arrName: arrName,
    arrIndex: arrIndex
  };
}

function isObject(value) {
  if (value == null) {
    return false;
  }

  return Boolean(
    typeof value === 'object' &&
      Object.prototype.toString.call(value) === '[object Object]' &&
      !Array.isArray(value)
  );
}

function isString(value) {
  var type = typeof value;
  return Boolean(
    type === 'string' ||
      (type === 'object' &&
        value != null &&
        !Array.isArray(value) &&
        Object.prototype.toString.call(value) === '[object String]')
  );
}

function traverseDelegateProperties(pathArray, settingsSlice) {
  // A string of the form a.b[4].c.names[2] is split into
  // [a, b[4], c, names, [2]]
  if (!Array.isArray(pathArray) || !pathArray.length) {
    return undefined;
  }

  var nextPathKey = pathArray[0];
  var nextPropertyValue;

  if (isArrayReference(nextPathKey)) {
    var nextPathKeyParts = sanitizeArrayKeyAndSplit(nextPathKey);
    nextPropertyValue =
      settingsSlice[nextPathKeyParts.arrName][nextPathKeyParts.arrIndex];
  } else {
    // objects
    nextPropertyValue = settingsSlice[nextPathKey];
  }

  if (pathArray.length === 1) {
    return nextPropertyValue;
  }

  return traverseDelegateProperties(pathArray.slice(1), nextPropertyValue);
}

function pluckSettingsValue(pathString, settings) {
  if (!isString(pathString) || !isObject(settings)) {
    return undefined;
  }

  return traverseDelegateProperties(pathString.split('.'), settings);
}

function pushValueIntoSettings(pathString, settings, value) {
  if (!isString(pathString) || !isObject(settings)) {
    return undefined;
  }

  var settingsCopy = objectAssign({}, settings);

  var pathSegments = pathString.split('.');
  var nextSettingsLevel = settingsCopy; // 2 references now point to "settingsCopy"

  // Pull off because this is the ultimate variable that needs to be granted the passed in value
  var finalSegment = pathSegments.pop();

  // traverse down to the inner-most path
  pathSegments.forEach(function (pathSegment, index) {
    if (isArrayReference(pathSegment)) {
      var nextPathKeyParts = sanitizeArrayKeyAndSplit(pathSegment);
      nextSettingsLevel =
        nextSettingsLevel[nextPathKeyParts.arrName][nextPathKeyParts.arrIndex];
    } else {
      nextSettingsLevel = nextSettingsLevel[pathSegment];
    }
  });

  // update the value
  if (isArrayReference(finalSegment)) {
    var nextPathKeyParts = sanitizeArrayKeyAndSplit(finalSegment);
    nextSettingsLevel[nextPathKeyParts.arrName][
      nextPathKeyParts.arrIndex
    ] = value;
  } else {
    nextSettingsLevel[finalSegment] = value;
  }

  return settingsCopy;
}

module.exports = {
  pluckSettingsValue: pluckSettingsValue,
  pushValueIntoSettings: pushValueIntoSettings
};
