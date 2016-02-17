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

var Rcoil = require('./src/rcoil');
var ExecutionDirector = require('./src/execution-director');
var Request = require('./src/request');
var ConsoleLogger = require('./src/console-logger');
var DevNullLogger = require('./src/devnull-logger');
var Players = require('./src/players');

module.exports = {
  Rcoil : Rcoil,
  ExecutionDirector : ExecutionDirector,
  Request : Request,
  ConsoleLogger : ConsoleLogger,
  DevNullLogger : DevNullLogger,
  Players: Players
};