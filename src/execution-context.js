/*
 * Copyright 2016 Stefano Buliani (@sapessi)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// external modules
var ReadWriteLock = require('rwlock');

const groupsLockName = "requestGroups";
const requestsLockName = "requests";
const requestDataLockName = "requestData";
const responseDataLockName = "responseData";

/**
 * The ExecutionContext object saves the state of the symphony execution, this includes all 
 * of the active request groups and requests as well as all request and response data.
 * Requests and responses are organized by group id and request name and are 
 * accessible through the responseData and requestData.
 * 
 * The ExecutionContext object uses the rwlock module to synchronize access to the internal
 * data structures.
 * 
 * @class
 * @constructor
 */
function ExecutionContext() {
  /**
   * The mutex used to synchronize reads and writes
   * 
   * @property {ReadWriteLock} _lock
   * @private
   */
  this._lock = new ReadWriteLock();
  /**
   * The temporary list of active request groups. This should never be access directly 
   * and only updated through its register and unregister methods.
   * 
   * @property {Array.<RequestGroup>} _activeGroups
   * @private 
   */
  this._activeGroups = [];
  /**
   * The temporary list of active requests. This should never be access directly 
   * and only updated through its register and unregister methods.
   * 
   * @property {Array.<Request>} _activeRequests
   * @private 
   */
  this._activeRequests = [];
  /**
   * The data structure containing all requests sent during the execution of a 
   * symphony. The object contains group ids as keys and then request names
   * as keys. 
   *
   * This structure should be accessed through the requestData method. 
   * @example
   * {
   *   firstGroup: {
   *     firstRequest: {
   *       config: {},
   *       inputFunc: function(),
   *       method: GET,
   *       body: ""
   *     }
   *   }
   * }
   * 
   * var tmpResp = context.responseData("testGroup", "listUsers");
   * return JSON.parse(tmpResp.body);
   * 
   * @property {Object} _requests
   * @private
   */
  this._requests = {};
  /**
   * 
   */
  this._responses = {};
}

/**
 * Registers a request group as currently being executed with the execution context
 * 
 * @function
 * @param {Object} group - The request group object to be registered
 */
ExecutionContext.prototype.registerActiveGroup = function (group) {
  this._lock.writeLock(groupsLockName, (function (release) {
    this._activeGroups.push(group);
    release();
  }).bind(this));
};

/**
 * Removes a request group from the list fo groups currently being executed
 * 
 * @function
 * @param {Object} group - The request group to be removed from the list
 */
ExecutionContext.prototype.unregisterActiveGroup = function (group) {
  this._lock.writeLock(groupsLockName, (function (release) {
    for (var i = 0; i < this._activeGroups.length; i++) {
      if (this._activeGroups[i].id == group.id) {
        this._activeGroups.splice(i, 1);
      }
    }

    release();
  }).bind(this));
};

/**
 * Looks up an returns a request group from the list of currently active groups.
 * 
 * @function
 * @param {String} groupId - The id of the group to look up
 * @return {Object} The group object from the active ones, null if it cannot be found
 */
ExecutionContext.prototype.getActiveGroup = function (groupId) {
  var group = null;
  this._lock.readLock(groupsLockName, (function (release) {
    for (var i = 0; i < this._activeGroups.length; i++) {
      if (this._activeGroups[i].id == groupId) {
        group = this._activeGroups[i];
      }
    }

    release();
  }).bind(this));

  return group;
};

/**
 * Performs a deep copy of the request group list and returns it.
 * 
 * @function
 * @return {Array.<RequestGroup>} The full list of currently active request groups.
 */
ExecutionContext.prototype.getActiveGroups = function () {
  var tmpActive = null;
  this._lock.readLock(groupsLockName, (function (release) {
    tmpActive = JSON.parse(JSON.stringify(this._activeGroups));
    release();
  }).bind(this));
  return tmpActive;
},

/**
 * Registers a request as currently being executed
 * 
 * @function
 * @param {Request} requestConfig - A valid request object
 */
ExecutionContext.prototype.registerActiveRequest = function (requestConfig) {
  this._lock.writeLock(requestsLockName, (function (release) {
    this._activeGroups.push(requestConfig);
    release();
  }).bind(this));
};

/**
 * removed a request from the list of active requests
 * 
 * @function
 * @param {Request} requestConfig - A request configuration
 */
ExecutionContext.prototype.unregisterActiveRequests = function (requestConfig) {
  this._lock.writeLock(requestsLockName, (function (release) {
    for (var i = 0; i < this._activeRequests.length; i++) {
      if (this._activeRequests[i].name == requestConfig.name) {
        this._activeRequests.splice(i, 1);
      }
    }

    release();
  }).bind(this));
};

/**
 * Retrieves a request from the list of active requests
 * 
 * @function
 * @param {String} requestName - The name of the request
 * @return {Request} The request config
 */
ExecutionContext.prototype.getActiveRequest = function (requestName) {
  var request = null;
  this._lock.readLock(requestsLockName, (function (release) {
    for (var req in this._activeRequests) {
      if (req.name == requestName) {
        request = req;
      }
    }

    release();
  }).bind(this));

  return request;
};

/**
 * Performs a deep copy of the list of active requests and return it
 * 
 * @function
 * @return {Array.<Request>} The list of active requests
 */
ExecutionContext.prototype.getActiveRequests = function () {
  var tmpActive = null;

  this._lock.readLock(requestsLockName, (function (release) {
    tmpActive = JSON.parse(JSON.stringify(this._activeRequests));
    release();
  }).bind(this));

  return tmpActive;
};

/**
 * Reads the request data generated for a specific request during the execution 
 * of the rcoil.
 * 
 * @example
 * var data = context.requestData("group1", "request1");
 * console.log(JSON.stringify(data, null, 2));
 * {
 *   config: requestConfig,
 *   headers: requestObject.headers,
 *   url: requestObject.url,
 *   method: requestObject.method,
 *   statusCode: requestObject.statusCode,
 *   body: requestBodyString,
 *   startTime: Date.now()
 * }
 * 
 * @function
 * @param {String} groupId - The request group id
 * @param {String} requestName - The name of the request
 * @return {Object} the request data sent to the remote server
 */
ExecutionContext.prototype.requestData = function (groupId, requestName) {
  var data = null;
  this._lock.readLock(requestDataLockName, (function (release) {
    if (this._requests[groupId] !== undefined && this._requests[groupId][requestName] !== undefined) {
      data = this._requests[groupId][requestName];
    }

    release();
  }).bind(this));
  return data;
};

/**
 * Saves a request data to the context. Request data should match this pattern:
 * @example
 * {
 *   config: requestConfig,
 *   headers: requestObject.headers,
 *   url: requestObject.url,
 *   method: requestObject.method,
 *   statusCode: requestObject.statusCode,
 *   body: requestBodyString,
 *   startTime: Date.now()
 * }
 * 
 * @function
 * @param {String} groupId - A request group id
 * @param {String} requestName - A request name
 * @param {Object} requestData - The request data
 */
ExecutionContext.prototype.setRequestData = function (groupId, requestName, requestData) {
  this._lock.writeLock(requestDataLockName, (function (release) {
    if (this._requests[groupId] === undefined)
      this._requests[groupId] = {};

    this._requests[groupId][requestName] = requestData;

    release();
  }).bind(this));
},

/**
 * Retrieves the response data for a specific request. 
 * 
 * @example
 * var data = context.responseData("group1", "request1");
 * console.log(JSON.stringify(data, null, 2));
 * {
 *   headers: resp.headers,
 *   httpVersion: resp.httpVersion,
 *   method: resp.method,
 *   statusCode: resp.statusCode,
 *   statusMessage: resp.statusMessage,
 *   body: responseOutputString,
 *   endTime: Date.now()
 * }
 * 
 * @function
 * @param {String} groupId - The request group id
 * @param {String} requestName - The request name
 */
ExecutionContext.prototype.responseData = function (groupId, requestName) {
  var data = null;

  this._lock.readLock(responseDataLockName, (function (release) {
    if (this._responses[groupId] !== undefined && this._responses[groupId][requestName] !== undefined) {
      data = this._responses[groupId][requestName];
    }

    release();
  }).bind(this));
  return data;
};

/**
 * Saves a response data in the context. Response data should match this pattern:
 * 
 * @example
 * {
 *   headers: resp.headers,
 *   httpVersion: resp.httpVersion,
 *   method: resp.method,
 *   statusCode: resp.statusCode,
 *   statusMessage: resp.statusMessage,
 *   body: responseOutputString,
 *   endTime: Date.now()
 * }
 * 
 * @function
 * @param {String} groupId - The request group id
 * @param {String} requestName - The request name
 * @param {Object} responseData - The response data object
 */
ExecutionContext.prototype.setResponseData = function (groupId, requestName, responseData) {
  this._lock.writeLock(responseDataLockName, (function (release) {
    if (this._responses[groupId] === undefined)
      this._responses[groupId] = {};

    this._responses[groupId][requestName] = responseData;

    release();
  }).bind(this));
};

/**
 * Retrieves the full request and response data structure for all requests and groups
 * in a coil.
 * 
 * @example
 * {
 *   req: { // all requests
 *     group1: { // grouped by request group
 *       request1 : {
 *         config: requestConfig,
 *         headers: requestObject.headers,
 *         url: requestObject.url,
 *         method: requestObject.method,
 *         statusCode: requestObject.statusCode,
 *         body: requestBodyString,
 *         startTime: Date.now()
 *       },
 *       ...
 *     },
 *     ...
 *   },
 *   res: { // all responses
 *     group1: { // grouped by request group
 *       request1: {
 *         headers: resp.headers,
 *         httpVersion: resp.httpVersion,
 *         method: resp.method,
 *         statusCode: resp.statusCode,
 *         statusMessage: resp.statusMessage,
 *         body: responseOutputString,
 *         endTime: Date.now()
 *       },
 *       ...
 *     },
 *     ...
 *   }
 * }
 * 
 * @function
 * @return {Object} The full list of requests and responses
 */
ExecutionContext.prototype.getData = function () {
  return {
    req: this._requests,
    res: this._responses
  };
};

module.exports = ExecutionContext;
