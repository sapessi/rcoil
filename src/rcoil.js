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

var Table = require('cli-table');
var colors = require('colors');

const Request = require('./request');

/**
 * The main Rcoil object. This is a tree structure made of request groups and requests.
 * Multiple requests and request groups can be executed simulatneously.
 * 
 * An Rcoil is meant to be interacted with in a more "human" way using the startGroup,
 * afterGroup, and addRequest methods.
 * 
 * @class
 * @constructor
 */
function Rcoil() {
  /**
   * The tree structure containing request groups and requests.
   * 
   * @property {Array}
   */
  this.calls = [];
  
  /**
   * temporary variable to store the current position in the tree during the 
   * creation by the start/after/add methods
   * 
   * @property {String}
   */
  this._tmpPositionId = "";
  
  /**
   * count of the number of request groups in the Rcoil. This is used by the 
   * director to confirm when the execution is completed
   * 
   * @property {int}
   */ 
  this._totalRequestGroups = 0;
};
  
/**
 * the process function needs to return an object with 2 properties: 
 * a boolean to tell the walker to return and a value to return.
 *  
 * @example
 * function(key, value) {
 *   return { shouldReturn: false, value: value }
 * }
 *
 * @callback treeWalkerCallback
 * @param {*} key - The key of the current property in the tree
 * @param {*} value - The value for the property
 */

/**
 * Walks the tree to find an object. It applies the process function
 * to each object in the tree. 
 * 
 * @function
 * @private
 * @param {Object} o - The tree to walk
 * @param {treeWalkerCallback} process - A callback function to process the node
 * 
 * @returns {*} Whatever the process function decides to return
 */
Rcoil.prototype._traverseTree = function (o, process) {
  var result;
  for (var i in o) {
    if (typeof (o[i]) !== 'object')
      continue;

    result = process(i, o[i]);
    if (result.shouldReturn) {
      return result.value;
    }

    if (o[i] !== null && typeof (o[i]) === 'object') {
      var subObject = this._traverseTree(o[i], process);
      if (subObject != null)
        return subObject;
    }
  }

  return null;
};

/**
 * Finds and returns a request group inside a tree
 * 
 * @Function
 * @private
 * @param {Object} o - The tree to walk
 * @param {String} groupId - The request group id to look for in the tree
 * 
 * @returns {Object} A request group object
 */
Rcoil.prototype._findRequestGroup = function (o, groupId) {
  return this._traverseTree(o, function (key, value) {
    var output = {
      shouldReturn: false,
      value: null
    };

    if (typeof (value) === 'object' && value != null && value.id == groupId) {
      output.shouldReturn = true;
      output.value = value;
    }

    return output;
  });
};

/**
 * Creates a new empty request group object with the given name
 * 
 * @function
 * @private
 * @param {String} name - The name for the new request group
 * 
 * @return {Object} a populated empty request group object
 */
Rcoil.prototype._createEmptyRequestGroup = function (groupId) {
  return {
    id: groupId,
    requests: [],
    children: []
  };
};

/**
 * Starts a new request group in the tree, the group will be a child of the 
 * current group (or root of the tree). Request groups created as children are
 * executed sequentially. 
 * 
 * To create two parallel request groups use the afterGroup method to return to 
 * the previous node of the tree.
 * @example
 * rcoil
 *   .startGroup("first")
 *     .startGroup("firstChild")
 *   .afterGroup("first") // going back to the first request group
 *     .startGroup("secondChild");
 * // requests within firstChild and secondChild will be execute simultaneously
 * 
 * @function
 * @param {String} groupId - A unique id for the request group in the tree
 * 
 * @return {Object} The Rcoil object
 */
Rcoil.prototype.startGroup = function (groupId) {
  if (this._findRequestGroup(this.calls, groupId) != null) {
    throw new Error("Request Group " + groupId + " already exists in your Symphony");
  }

  if (this._tmpPositionId != "") {
    this._findRequestGroup(this.calls, this._tmpPositionId).children.push(this._createEmptyRequestGroup(groupId))
  } else {
    this.calls.push(this._createEmptyRequestGroup(groupId));
  }
  this._tmpPositionId = groupId;
  this._totalRequestGroups++;

  return this;
},
    
/**
 * Returns to the given position in the tree.
 * 
 * @function
 * @param {String} groupId - The name of the node we need to walk back to
 * 
 * @return {Object} The symphony object
 */
Rcoil.prototype.afterGroup = function (groupId) {
  this._tmpPositionId = groupId;

  return this;
},

/**
 * Adds a request to the current request group (started by startGroup or moved to by
 * afterGroup).
 * 
 * @example
 * rcoil
 *  .startGroup("testGroup")
 *    .addRequest(Request.get("listUsers", "https://api.com/listUsers"));
 * 
 * @function
 * @param {Request} request - A configured request object
 * 
 * @return {Object} The symphony object
 */
Rcoil.prototype.addRequest = function (request) {
  if (this._tmpPositionId == "") {
    throw new Error("Cannot add requests without starting a group first");
  }
  
  if (!(request instanceof Request)) {
    throw new Error("Invalid Request object");
  }

  this._findRequestGroup(this.calls, this._tmpPositionId).requests.push(request);

  return this;
},

/**
 * Returns the walker to the root node of the tree
 * 
 * @function
 * @return {Object} The symphony object
 */
Rcoil.prototype.fromTheBeginning = function () {
  this._tmpPositionId = "";

  return this;
},

/**
 * Retrieves the total number of request groups in the this symphony
 * 
 * @function
 * @return {int} The number of request groups
 */
Rcoil.prototype.requestGroupsCount = function () {
  return this._totalRequestGroups;
}

/**
 * Uses console log and unicode tables to print out the structure of the coil
 * 
 * @function
 */
Rcoil.prototype.printCoil = function() {
  console.log("Rcoil execution plan".white.bold);
  
  for (var i = 0; i < this.calls.length; i++) {
    this._printRequestGroup(this.calls[i], 1);
  }
}

/**
 * Prints a request group as a unicode table to the console
 * 
 * @function
 * @private
 * @param {Object} group - The request group to be printed
 * @param {int} level - The depth of the current group in the coil, this sets the spacing from the right 
 */
Rcoil.prototype._printRequestGroup = function(group, level) {
  var spacer = "";
  for (var i = 0; i < level; i++) spacer += "    ";
  // TODO: Spacer doesn't work nicely with the Table here.
  console.log((spacer + "↪ Request Group: " + group.id).blue.bold);
  
  var table = new Table({
    chars: { 'top': '═' , 'top-mid': '╤' , 'top-left': '╔' , 'top-right': '╗'
          , 'bottom': '═' , 'bottom-mid': '╧' , 'bottom-left':  '╚' , 'bottom-right': '╝'
          , 'left': '║' , 'left-mid':  '╟' , 'mid': '─' , 'mid-mid': '┼'
          , 'right': '║' , 'right-mid': '╢' , 'middle': '│' }
  });
  
  for (var i = 0; i < group.requests.length; i++) {
    var request = group.requests[i];
    table.push(
      [request.name, request.type, request.getUrl()]
    );
  }
  
  var tableString = table.toString();
  tableString = tableString.replace(new RegExp(/^/gm), spacer);
  console.log(tableString);
  
  for (var i = 0; i < group.children.length; i++) {
    this._printRequestGroup(group.children[i], level+1);
  }
}

module.exports = Rcoil;