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

var colors = require('colors');
var moment = require('moment');

/**
 * Logger object that sends output to the stdout (console.log) and uses
 * the colors package to highlight info, debug, warn, and error lines.
 * 
 * @class
 * @constructor
 */
var ConsoleLogger = function () {

};

/**
 * Return a formatted timestamp string for the logs
 * 
 * @function
 * @return {String} A formatted timestamp string as [YYYY-MM-DD HH:mm:ss.SS]
 */
ConsoleLogger.prototype.timestamp = function () {
  return "[" + moment().format('YYYY-MM-DD HH:mm:ss.SS') + "]: ";
};

/**
 * Logs an info message
 * 
 * @function
 * @param {String} message - The message
 */
ConsoleLogger.prototype.info = function (message) {
  console.log(this.timestamp() + message.blue);
};

/**
 * Logs a debug message
 * 
 * @function
 * @param {String} message - The message
 */
ConsoleLogger.prototype.debug = function (message) {
  console.log(this.timestamp() + message.magenta);
};

/**
 * Logs a warn message
 * 
 * @function
 * @param {String} message - The message
 */
ConsoleLogger.prototype.warn = function (message) {
  console.log(this.timestamp() + message.yellow);
};

/**
 * Logs an error message
 * 
 * @function
 * @param {String} message - The message
 */
ConsoleLogger.prototype.error = function (message) {
  console.log(this.timestamp() + message.red);
};

module.exports = ConsoleLogger;
