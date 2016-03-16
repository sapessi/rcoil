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

// core modules
const util = require('util');
const events = require('events');

// local modules
var RequestGroupPlayer = require('./players').RequestGroupPlayer;
var ExecutionContext = require('./execution-context');
var Rcoil = require('./rcoil');
var DevNullLogger = require('./devnull-logger');
var Request = require('./request');

/**
 * The ExecutionDirector receives and executes an Rcoil tree. 
 * 
 * Options available are:
 * @example
 * {
 *   debug: false,
 *   logger: new ConsoleLogger();
 * }
 * 
 * @class
 * @constructor
 * @param {Rcoil} rcoil - An initialized Rcoil object
 * @param {Object} options - Configuration options for the director
 * 
 * @fires ExecutionDirector#end
 * @fires ExecutionDirector#groupStart
 * @fires ExecutionDirector#groupEnd
 * @fires ExecutionDirector#requestStart
 * @fires ExecutionDirector#requestEnd
 */
function ExecutionDirector(rcoil, options) {
  /**
   * The Rcoil object
   * 
   * @property {Rcoil}
   */
  this.rcoil = rcoil;
  /**
   * The execution context, this is updated during the execution of the Rcoil
   * and passed to all callbacks and events.
   * 
   * @property {ExecutionContext}
   */
  this.executionContext = new ExecutionContext();

  /**
   * Configuration options for the director. These are passed to the RequestGroup 
   * and Request players.
   * 
   * @property {Object}
   */
  this.options = {
    debug: false,
    logger: new DevNullLogger(),
    awsConfig: null
  };
  util._extend(this.options, options);
  
  /**
   * Total number of reuqest groups in the coil
   * 
   * @property {int}
   * @private
   */
  this._totalGroups = 0;
  /**
   * Temporary counter used to track how many groups have been executed.
   * 
   * @property {int}
   * @private
   */
  this._tmpGroupsCounter = 0;
  
  /**
   * This tells the director that the execution was aborted and should not start
   * any new requests
   * 
   * @property {bool}
   * @private
   */
  this._aborted = false;
  
  /**
   * The callback passed to the start method of the ExecutionDirector. This is called when the 
   * ExecutionDirector successfully completes the execution of an Rcoil object. If the execution 
   * is aborted the abort event is trggered.
   * 
   * @property {function}
   * @private
   */
  this._endCallback = null;

  events.EventEmitter.call(this);
}
util.inherits(ExecutionDirector, events.EventEmitter);

/**
 * The abort event is fired whenever the abort method is called on a director and 
 * all running requests are completed.
 * 
 * @event ExecutionDirector#abort
 * @type {Object}
 * @property {ExecutionContext} context - The completed execution context
 */

/**
 * The groupStart event is fired every time the director starts the execution of a 
 * new request group
 * 
 * @event ExecutionDirector#groupStart
 * @type {Object}
 * @property {Object} group - The request group being started
 * @property {ExecutionContext} context - The updated execution context
 */

/**
 * The groupEnd event is fired every time the director completes the execution of a 
 * request group
 * 
 * @event ExecutionDirector#groupEnd
 * @type {Object}
 * @property {Object} group - The request group being started
 * @property {ExecutionContext} context - The updated execution context
 */

/**
 * The requestStart event is fired every time the director starts the execution of a 
 * request
 * 
 * @event ExecutionDirector#requestStart
 * @type {Object}
 * @property {String} groupId - The request group id the request belongs to
 * @property {Request} request - The request being started
 * @property {ExecutionContext} context - The updated execution context
 */

/**
 * The requestEnd event is fired every time the director completes the execution of a 
 * request
 * 
 * @event ExecutionDirector#requestEnd
 * @type {Object}
 * @property {String} groupId - The request group id the request belongs to
 * @property {Request} request - The completed request
 * @property {ExecutionContext} context - The updated execution context
 */

/**
 * Private method used to respond to the start event from the RequestGroupPlayer
 * 
 * @function
 * @private
 * @param {Object} requestGroup - The request group
 */
ExecutionDirector.prototype._requestGroupStarted = function (requestGroup) {
  requestGroup.startTime = Date.now();
  this.executionContext.registerActiveGroup(requestGroup);
  this.emit("groupStart", requestGroup, this.executionContext);
  this.options.logger.info("Request group " + requestGroup.id + " started");
};

/**
 * Checks if the execution of the Rcoil was aborted. If it was checks that all active
 * requests have completed executing and then fires the "abort" event before returning.
 * 
 * @function
 * @private
 * @return {bool} true if the execution was aborted, false otherwise.
 */
ExecutionDirector.prototype._isAborted = function() {
  if (this._aborted) {
    // all requests have completed the execution, we can emit the event
    if (this.executionContext.getActiveRequests().length == 0) {
      this.emit("abort", this.executionContext);
    }
    return true;
  }
  
  return false;
}

/**
 * Private method used to respond to the end event from the RequestGroupPlayer
 * 
 * @function
 * @private
 * @param {Object} requestGroup - The request group
 */
ExecutionDirector.prototype._requestGroupDone = function (requestGroup) {
  requestGroup.endTime = Date.now();
  this.executionContext.unregisterActiveGroup(requestGroup);
  this._tmpGroupsCounter++;
  
  if (this._isAborted()) return;
    
  this.emit("groupEnd", requestGroup, this.executionContext);

  var execTime = requestGroup.endTime - requestGroup.startTime;
  this.options.logger.info("Request group " + requestGroup.id + " finished in: " + execTime);

  for (var i = 0; i < requestGroup.children.length; i++) {
    var childPlayer = this._getRequestGroupPlayer(requestGroup.children[i])
    childPlayer.start();
  }

  if (requestGroup.children.length == 0 && this._tmpGroupsCounter == this._totalGroups) {
    if (this._endCallback != null)
      this._endCallback(this.executionContext);
  }
};

/**
 * Private method used to respond to the requestStart event from the RequestGroupPlayer
 * 
 * @function
 * @private
 * @property {Object} requestGroup - The completed request group object
 * @property {Request} requestConfig - The request configuration passed to the RequestPlayer
 * @property {http.ClientRequest} requestObject - The node.js http/s request object
 * @property {*} input - The input generated for the request by the callback function
 */
ExecutionDirector.prototype._requestStarted = function (requestGroup, requestConfig, requestObject, input) {
  this.executionContext.registerActiveRequest(requestConfig);

  var request = {
    config: requestConfig,
    body: input,
    startTime: Date.now()
  };
  
  switch (requestConfig.type) { 
    case Request.RequestType.HTTP:
      request.headers = requestObject.headers;
      request.url = requestObject.url;
      request.method = requestObject.method;
      break;  
  } 

  this.executionContext.setRequestData(requestGroup.id, requestConfig.name, request); //util.inspect(requestObject, {showHidden:true, depth: null})
  
  this.emit("requestStart", requestGroup.id, requestConfig, this.executionContext);
  
  this.options.logger.info("Request " + requestConfig.name + " started");
};

/**
 * Private method used to respond to the requestEnd event from the RequestGroupPlayer
 * 
 * @function
 * @private
 * @property {Object} requestGroup - The completed request group object
 * @property {Request} requestConfig - The request configuration passed to the RequestPlayer
 * @property {http.IncomingMessage} response - The response object from the node.js http/s client
 * @property {*} output - The output returned from the remote server
 */
ExecutionDirector.prototype._requestDone = function (requestGroup, requestConfig, resp, output) {
  this.executionContext.unregisterActiveRequests(requestConfig);
  
  var response = {
    body: output,
    endTime: Date.now(),
    isCanceled: false
  };
  
  switch (requestConfig.type) {
    case Request.RequestType.HTTP:
      response.headers = resp.headers;
      response.httpVersion = resp.httpVersion;
      response.method = resp.method;
      response.statusCode = resp.statusCode;
      response.statusMessage = resp.statusMessage;
      break;
    case Request.RequestType.LAMBDA:
      response.err = resp;
      break;
  }

  this.executionContext.setResponseData(requestGroup.id, requestConfig.name, response);
  this.options.logger.info("Request " + requestConfig.name + " finished");

  this.emit("requestEnd", requestGroup.id, requestConfig, this.executionContext);

  if (this.options.debug) {
    var execTime = response.endTime - this.executionContext.requestData(requestGroup.id, requestConfig.name).startTime;
    this.options.logger.debug("Request " + requestConfig.name + " executed in: " + execTime + "ms");
  }  
};

/**
 * Handles requests being canceled by returning false from the onInput function
 * 
 * @function
 * @private
 * @property {Object} requestGroup - The completed request group object
 * @property {Request} requestConfig - The request configuration passed to the RequestPlayer
 */
ExecutionDirector.prototype._requestCanceled = function(requestGroup, requestConfig) {
  this.executionContext.unregisterActiveRequests(requestConfig);
    
  var response = {
    endTime: Date.now(),
    isCanceled: true
  };
  
  this.executionContext.setResponseData(requestGroup.id, requestConfig.name, response);
  this.options.logger.info("Request " + requestConfig.name + " canceled");
  
  this.emit("requestEnd", requestGroup.id, requestConfig, this.executionContext);
}

/**
 * Returns an initialized RequestGroupPlayer with all events associated to the private methods 
 * of the director.
 * 
 * @function
 * @private
 * @param {Object} requestGroup - The request group object for the player
 */
ExecutionDirector.prototype._getRequestGroupPlayer = function (requestGroup) {
  var player = new RequestGroupPlayer(requestGroup, this.executionContext, this.options);

  player.on("start", this._requestGroupStarted.bind(this));
  player.on("end", this._requestGroupDone.bind(this));
  player.on("requestStart", this._requestStarted.bind(this));
  player.on("requestEnd", this._requestDone.bind(this));
  player.on("requestCancel", this._requestCanceled.bind(this));
  return player;
};

/**
 * Begins the execution of the Rcoil object
 * 
 * @function
 * @return {ExecutionContext} The execution context object that the director will keep updating
 *   throughout the execution
 */
ExecutionDirector.prototype.start = function (callback) {
  this._totalGroups = this.rcoil.requestGroupsCount();
  this._tmpGroupsCounter = 0;
  this._endCallback = callback;
  
  for (var i = 0; i < this.rcoil.calls.length; i++) {
    var player = this._getRequestGroupPlayer(this.rcoil.calls[i]);
    player.start();
  }

  return this.executionContext;
};

/**
 * Aborts the execution of an Rcoil.
 * 
 * @function
 */
ExecutionDirector.prototype.abort = function () {
  this._aborted = true;
  return;
};

module.exports = ExecutionDirector;
