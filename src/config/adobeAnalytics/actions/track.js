'use strict';

var assign = require('assign');
var encodeObjectToURI = require('encodeObjectToURI');
var isHTTPS = require('isHTTPS');
var clientInfo = require('clientInfo');
var createBeacon = require('createBeacon');

// TODO: Handle canceling tool initialization. Not sure why this is supported.
var AdobeAnalytics = function(extensionSettings) {
  this.extensionSettings = extensionSettings;
};

assign(AdobeAnalytics.prototype, {
  _queryStringParamMap: {
    browserHeight: 'bh',
    browserWidth: 'bw',
    campaign: 'v0',
    channel: 'ch',
    charSet: 'ce',
    colorDepth: 'c',
    connectionType: 'ct',
    cookiesEnabled: function(obj, key, value) {
      obj.k = value ? 'Y' : 'N';
    },
    currencyCode: 'cc',
    dynamicVariablePrefix: 'D',
    eVar: function(obj, key, value) {
      obj['v' + key.substr(4)] = value;
    },
    events: function(obj, key, value) {
      obj.events = value.join(',');
    },
    hier: function(obj, key, value) {
      obj['h' + key.substr(4)] = value.substr(0, 255);
    },
    homePage: function(obj, key, value) {
      obj.hp = value ? 'Y' : 'N';
    },
    javaEnabled: function(obj, key, value) {
      obj.v = value ? 'Y' : 'N';
    },
    javaScriptVersion: 'j',
    linkName: 'pev2',
    linkType: function(obj, key, value) {
      obj.pe = 'lnk_' + value;
    },
    linkURL: 'pev1',
    pageName: 'pageName',
    pageType: 'pageType',
    pageURL: function(obj, key, value) {
      obj.g = value.substr(0, 255);
      if (value.length > 255) {
        obj['-g'] = value.substring(255);
      }
    },
    plugins: 'p',
    products: 'products',
    prop: function(obj, key, value) {
      obj['c' + key.substr(4)] = value;
    },
    purchaseID: 'purchaseID',
    referrer: 'r',
    resolution: 's',
    server: 'server',
    state: 'state',
    timestamp: 'ts',
    transactionID: 'xact',
    visitorID: 'vid',
    marketingCloudVisitorID: 'mid',
    zip: 'zip'
  },
  _translateToQueryStringParam: function(queryStringObj, key, value) {
    var translator = this._queryStringParamMap[key];

    if (!translator) {
      // Things like prop1 and prop2 use the same translator. Also, eVar1 and eVar2.
      var prefix = key.substr(0, 4);
      translator = this._queryStringParamMap[prefix];
    }

    if (translator) {
      if (typeof translator === 'string') {
        queryStringObj[translator] = value;
      } else {
        translator(queryStringObj, key, value);
      }
    }
  },
  _remodelDataToQueryString: function(data) {
    var queryStringParams = {};
    var key;

    queryStringParams.t = this._getTimestamp();

    var ci = data.clientInfo;

    if (ci) {
      for (key in ci) {
        if (ci.hasOwnProperty(key)) {
          var ciValue = ci[key];
          if (ciValue) {
            this._translateToQueryStringParam(queryStringParams, key, ciValue);
          }
        }
      }
    }

    var vars = data.vars;

    if (vars) {
      for (key in vars) {
        if (vars.hasOwnProperty(key)) {
          var varValue = vars[key];
          if (varValue) {
            this._translateToQueryStringParam(queryStringParams, key, varValue);
          }
        }
      }
    }

    var events = data.events;

    if (events) {
      this._translateToQueryStringParam(queryStringParams, 'events', events);
    }

    return encodeObjectToURI(queryStringParams);
  },
  _getTrackingURI: function(queryString) {
    var tagContainerMarker = 'D' + _satellite.appVersion;
    var cacheBuster = 's' + Math.floor(new Date().getTime() / 10800000) % 10 +
      Math.floor(Math.random() * 10000000000000);
    // TODO: Is this necessary or should we just leave off the protocol?
    var protocol = isHTTPS() ? 'https://' : 'http://';
    var uri = protocol + this._getTrackingServer() + '/b/ss/' + this.extensionSettings.account +
      '/1/JS-1.4.3-' + tagContainerMarker + '/' + cacheBuster;

    if (queryString) {
      if (queryString[0] !== '?') {
        uri += '?';
      }

      uri += queryString;
    }

    return uri;
  },
  _getTimestamp: function() {
    var now = new Date();
    var year = now.getYear();
    return now.getDate() + '/'
      + now.getMonth() + '/'
      + (year < 1900 ? year + 1900 : year) + ' '
      + now.getHours() + ':'
      + now.getMinutes() + ':'
      + now.getSeconds() + ' '
      + now.getDay() + ' '
      + now.getTimezoneOffset();
  },
  _getTrackingServer: function() {
    // TODO: Use getAccount from tool since it deals with accountByHost? What is
    // accountByHost anyway?
    // TODO: What do we do if account is not default. Returning null is probably not awesome.
    if (this.extensionSettings.trackingServer) {
      return this.extensionSettings.trackingServer;
    }

    var account = this.extensionSettings.account;

    if (!account) {
      return null;
    }

    // based on code in AppMeasurement.
    /*eslint-disable*/
    var c = '';
    var dataCenter = this.extensionSettings.trackVars.dc || 'd1';
    var e;
    var f;
    e = account.indexOf(',');
    e >= 0 && (account = account.gb(0, e));
    account = account.replace(/[^A-Za-z0-9]/g, '');
    c || (c = '2o7.net');
    c == '2o7.net' && (dataCenter == 'd1' ? dataCenter = '112' : dataCenter == 'd2' && (dataCenter = '122'), f = '');
    e = account + '.' + dataCenter + '.' + f + c;
    /*eslint-enable*/
    return e;
  },
  trackPageView: function(actionSettings) {
    var trackVars = {};
    assign(trackVars, this.extensionSettings.trackVars);
    assign(trackVars, actionSettings.trackVars);

    // Referrer is intentionally only tracked on the first page view beacon.
    if (this.initialPageViewTracked) {
      delete this.referrer;
    }

    this.initialPageViewTracked = true;

    if (actionSettings.customSetup) {
      // TODO: Do we need to send the originating event into the custom setup function?
      actionSettings.customSetup();
    }

    this._track(trackVars, actionSettings.trackEvents);
  },
  _doesExtensionVarApplyToLinkTracking: function(varName) {
    /*eslint-disable max-len*/
    return !/^(eVar[0-9]+)|(prop[0-9]+)|(hier[0-9]+)|campaign|purchaseID|channel|server|state|zip|pageType$/.test(varName);
    /*eslint-enable max-len*/
  },
  trackLink: function(actionSettings) {
    var trackVars = {};

    for (var varName in this.extensionSettings.trackVars) {
      if (this._doesExtensionVarApplyToLinkTracking(varName)) {
        trackVars[varName] = this.extensionSettings.trackVars[varName];
      }
    }

    assign(trackVars, actionSettings.trackVars);

    // Referrer is never sent for link tracking.
    delete trackVars.referrer;

    if (actionSettings.customSetup) {
      // TODO: Do we need to send the originating event into the custom setup function?
      actionSettings.customSetup();
    }

    this._track(trackVars, actionSettings.trackEvents);
  },
  _track: function(trackVars, trackEvents) {
    var queryString = this._remodelDataToQueryString({
      vars: trackVars,
      events: trackEvents,
      clientInfo: clientInfo.getSnapshot()
    });

    var uri = this._getTrackingURI(queryString);

    createBeacon({
      beaconURL: uri,
      type: 'image'
    });

    // TODO: Only used during development. Remove when done.
    //if (window.recordDTMUrl) {
    //  window.recordDTMUrl(uri);
    //}
  }
});

var instanceByIntegrationId = {};

module.exports = function(settings) {
  settings.integrationsSettings.forEach(function(integrationSettings) {
    var instance = instanceByIntegrationId[integrationSettings.id];

    if (!instance) {
      instance = instanceByIntegrationId[integrationSettings.id] =
          new AdobeAnalytics(settings.extensionSettings);
    }

    switch (settings.actionSettings.trackType) {
      case 'link':
        instance.trackLink(settings.actionSettings);
        break;
      case 'pageView':
        instance.trackPageView(settings.actionSettings);
        break;
    }
  });
};