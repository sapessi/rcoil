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

var url = require('url');
var validUrl = require('valid-url');

/**
 * The Request object contains the configuration for a single backend requests.
 * The request object can represent both an HTTP request and a Lambda function invocation.
 * 
 * HTTP requests can be created using the static shortcuts or the instance methods. Request
 * creation methods can receive either a target url or a full request configuration. 
 * 
 * @example
 * // To quickly create a get request
 * var req = Request.get("name", "http://myapi.com/test");
 * 
 * // to sepcify a full configuration
 * var req = Request.get("name", {
 *     host: "myapi.com",
 *     path: "/test",
 *     port: "80",
 *     protocol: "http:",
 *     method: "GET"
 * });
 * 
 * // Request body can be set using the onInput callback
 * req.onInput(function(context, requestObject) {
 *   return {
 *     request: "body"
 *   };
 * });
 * 
 * @class
 * @constructor
 * @param {String} name - A name to uniquely identify the request object 
 */
function Request(name) {
  this.type = "";
  this.name = name;
  this.settings = {};
  this.inputFunc = null;
  this.outputFunc = null;
}

/**
 * the input function generates and returns request bodies for the coil's requests.
 * The callback is triggered by the RequestPlayer before it starts each request. When
 * starting an HTTP request the input callback is triggered with the ExecutionContext
 * and the generated http.ClientRequest object. When invoking a Lambda function the
 * callback simply receives the context.
 *  
 * @example
 * // for HTTP requests
 * function(executionContext, httpRequest) {
 *   httpRequest.setHeader("x-customHeader", "customHeaderValue");
 * 
 *   return { 
 *     requestBodyParam1 : "value",
 *     requestBodyParam2 : "value2"
 *   }
 * }
 * 
 * // for Lambda invocations
 * function(executionContext) {
 *   return {
 *     lambdaEventProperty1: "value1",
 *   }
 * }
 *
 * @callback inputCallback
 * @param {ExecutionContext} executionContext - The populated execution context object
 * @param {http.ClientRequest} httpRequest - The generated HTTP request
 */

/**
 * An object to simplify the creation of HTTP requests
 * 
 * @example
 * var r = new Request("requestName");
 * r.setHttpRequest(Request.HttpVerb.GET, "http://api.com/test");
 * 
 * @roperty {Object} 
 */
Request.HttpVerb = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  HEAD: "HEAD",
  DELETE: "DELETE",
  OPTIONS: "OPTIONS"
};

Request.RequestType = {
  HTTP: "http",
  LAMBDA: "lambda"
};

/**
 * Creates a GET HTTP request. Can receive a url for the request or a full configuration object.
 * 
 * @function
 * @param {String} name - A name that uniquely identifies the request
 * @param {String|Object} config - A url string or a request configuration
 * @return {Request} An initialized request object
 */
Request.get = function (name, config) {
  return new Request(name).setGet(config);
};
/**
 * Creates a POST HTTP request. Can receive a url for the request or a full configuration object.
 * 
 * @function
 * @param {String} name - A name that uniquely identifies the request
 * @param {String|Object} config - A url string or a request configuration
 * @return {Request} An initialized request object
 */
Request.post = function (name, config) {
  return new Request(name).setPost(config);
};
/**
 * Creates a PUT HTTP request. Can receive a url for the request or a full configuration object.
 * 
 * @function
 * @param {String} name - A name that uniquely identifies the request
 * @param {String|Object} config - A url string or a request configuration
 * @return {Request} An initialized request object
 */
Request.put = function (name, config) {
  return new Request(name).setPut(config);
};
/**
 * Creates a PATCH HTTP request. Can receive a url for the request or a full configuration object.
 * 
 * @function
 * @param {String} name - A name that uniquely identifies the request
 * @param {String|Object} config - A url string or a request configuration
 * @return {Request} An initialized request object
 */
Request.patch = function (name, config) {
  return new Request(name).setPatch(config);
};
/**
 * Creates a HEAD HTTP request. Can receive a url for the request or a full configuration object.
 * 
 * @function
 * @param {String} name - A name that uniquely identifies the request
 * @param {String|Object} config - A url string or a request configuration
 * @return {Request} An initialized request object
 */
Request.head = function (name, config) {
  return new Request(name).setHead(config);
};
/**
 * Creates a DELETE HTTP request. Can receive a url for the request or a full configuration object.
 * 
 * @function
 * @param {String} name - A name that uniquely identifies the request
 * @param {String|Object} config - A url string or a request configuration
 * @return {Request} An initialized request object
 */
Request.delete = function (name, config) {
  return new Request(name).setDelete(config);
};
/**
 * Creates a OPTIONS HTTP request. Can receive a url for the request or a full configuration object.
 * 
 * @function
 * @param {String} name - A name that uniquely identifies the request
 * @param {String|Object} config - A url string or a request configuration
 * @return {Request} An initialized request object
 */
Request.options = function (name, config) {
  return new Request(name).setOptions(config);
};

/**
 * Creates a Lambda request give a Lambda function ARN.
 * 
 * @function
 * @param {String} name - A name that uniquely identifies the request
 * @param {String|Object} config - A valid Lambda function ARN
 * @return {Request} An initialized request object
 */
Request.lambda = function(name, functionArn, qualifier) {
  return new Request(name).setLambda(functionArn, qualifier);
};

/**
 * Sets up the request object for a Lambda function. This private method is used by 
 * the public shortcuts.
 * 
 * @function
 * @private
 * @param {String} functionArn - A valid Lambda function ARN
 * @param {String} qualifier - A Lambda function version or alias
 */
Request.prototype._createLambdaRequest = function (functionArn, qualifier) {
  this.type = Request.RequestType.LAMBDA;
  this.settings = {
    function: functionArn,
    qualifier: (qualifier === undefined || qualifier == null || qualifier == ""?"$LATEST":qualifier)
  };
};

/**
 * Sets up the request as an HTTP request. This private method is used by the public
 * shortcuts.
 * 
 * @function
 * @private
 * @param {String} httpVerb - The HTTP verb of the request. 
 * @param {String|Object} config - This can be a url for the request or a full request object
 *  configuration
 */
Request.prototype._createHttpRequest = function (httpVerb, config) {
  this.type = Request.RequestType.HTTP,
  this.settings = {}

  if (typeof config === 'object') {
    if (!config.hasOwnProperty('host') ||
        !config.hasOwnProperty('path') ||
        !config.hasOwnProperty('protocol') ||
        !config.hasOwnProperty('method')) {
          throw new Error("Invalid request configuration. Missing parameters");
        }
    this.settings = config;
  } else {
    if (!validUrl.isUri(config)) {
      throw new Error("Invalid request url: " + config);
    }

    var parsedUrl = url.parse(config);

    this.settings = {
      host: parsedUrl.hostname,
      path: (parsedUrl.path != null ? parsedUrl.path : "") + (parsedUrl.hash != null ? parsedUrl.hash : ""),
      port: parsedUrl.port,
      protocol: parsedUrl.protocol,
      method: httpVerb.toUpperCase()
    };
  }
};

/**
 * constructs the full URL of the request from the settings object. For HTTP requests it returns the full
 * request url, for LAMBDA requests it returns the full function ARN + qualifier.
 * 
 * @function
 * @return {String} The URL for the function
 */
Request.prototype.getUrl = function() {
  switch (this.type) {
    case Request.RequestType.HTTP:
      return this.settings.protocol + "//" + this.settings.host + ":" + this.settings.port + this.settings.path;
      break;
    case Request.RequestType.LAMBDA:
      return this.settings.function + ":" + this.settings.qualifier;
      break;
  }
}

/**
 * Sets up the request object as an HTTP request
 * 
 * @function
 * @param {String} httpVerb - The HTTP verb of the request. 
 * @param {String|Object} config - This can be a url for the request or a full request object
 *  configuration
 * @return {Request} The updated request object
 */
Request.prototype.setHttpRequest = function (httpVerb, config) {
  this._createHttpRequest(httpVerb, config);
  return this;
};

/**
 * Sets up the request object as an HTTP GET request. 
 * 
 * @function
 * @param {String|Object} config - This can be a url for the request or a full request object
 * @return {Request} The updated request object
 */
Request.prototype.setGet = function (config) {
  return this.setHttpRequest(Request.HttpVerb.GET, config);
};
/**
 * Sets up the request object as an HTTP POST request. 
 * 
 * @function
 * @param {String|Object} config - This can be a url for the request or a full request object
 * @return {Request} The updated request object
 */
Request.prototype.setPost = function (config) {
  return this.setHttpRequest(Request.HttpVerb.POST, config);
};
/**
 * Sets up the request object as an HTTP PUT request. 
 * 
 * @function
 * @param {String|Object} config - This can be a url for the request or a full request object
 * @return {Request} The updated request object
 */
Request.prototype.setPut = function (config) {
  return this.setHttpRequest(Request.HttpVerb.PUT, config);
};
/**
 * Sets up the request object as an HTTP PATCH request. 
 * 
 * @function
 * @param {String|Object} config - This can be a url for the request or a full request object
 * @return {Request} The updated request object
 */
Request.prototype.setPatch = function (config) {
  return this.setHttpRequest(Request.HttpVerb.PATCH, config);
};
/**
 * Sets up the request object as an HTTP DELETE request. 
 * 
 * @function
 * @param {String|Object} config - This can be a url for the request or a full request object
 * @return {Request} The updated request object
 */
Request.prototype.setDelete = function (config) {
  return this.setHttpRequest(Request.HttpVerb.DELETE, config);
};
/**
 * Sets up the request object as an HTTP HEAD request. 
 * 
 * @function
 * @param {String|Object} config - This can be a url for the request or a full request object
 * @return {Request} The updated request object
 */
Request.prototype.setHead = function (config) {
  return this.setHttpRequest(Request.HttpVerb.HEAD, config);
};
/**
 * Sets up the request object as an HTTP OPTIONS request. 
 * 
 * @function
 * @param {String|Object} config - This can be a url for the request or a full request object
 * @return {Request} The updated request object
 */
Request.prototype.setOptions = function (config) {
  return this.setHttpRequest(Request.HttpVerb.OPTIONS, config);
};
/**
 * Sets up the request object as a Lambda function invocation 
 * 
 * @function
 * @param {String} functionArn - A valid Lambda function ARN
 * @param {String} qualifier - A Lambda function version or alias
 * @return {Request} The updated request object
 */
Request.prototype.setLambda = function (functionArn, qualifier) {
  this._createLambdaRequest.call(this, functionArn, qualifier);
  return this;
};

/**
 * Adds a callback function that will be executed just before the request is executed.
 * Use the function to return an input for the request. The function will receive the context
 * as a paramter.
 * 
 * If the Request is an HTTP request then the input function will receive both the context 
 * and the populated http.ClientRequest object. If it's a Lambda invoke the callback will
 * only receive the context.
 * 
 * @example
 * Request.post("createUser2", "http://myapi.com/createUser2")
 *   .onInput(function(context, requestObject) {
 *      // use the context object to read the response from a previous request
 *      var tmpResp = context.responseData("test", "createUser1");
 *      return JSON.parse(tmpResp.body);
 *   });
 */
Request.prototype.onInput = function (inputFunc) {
  this.inputFunc = inputFunc;
  return this; 
};


module.exports = Request;
