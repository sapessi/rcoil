# Rcoil
Rcoil is an orchestration library that makes it easy to call multiple APIs or AWS Lambda functions and aggregate the output into a single response.

Rcoil was originally built to help Amazon API Gateway customers orchestrate requests to complex backends into a single API call.

[![Build Status](https://travis-ci.org/SAPessi/rcoil.svg?branch=master)](https://travis-ci.org/SAPessi/rcoil)

# Installation
To install Rcoil run 
```
npm install rcoil
```

# Usage
The main object is Rcoil. Rcoil is a tree structure of request groups and requests. Request groups can contain multiple requests and have child group.

Requests within a request group are executed simultaneously and. Similarly, request groups can have multiple request groups as children, the child request groups are also executed simultaneously.

The `ExecutionDirector` object runs an Rcoil and the callback passed to the `start()` method has access to the aggregated results in an `ExecutionContext` object.

The first step is to import the Rcoil module. The Rcoil module includes multiple packages, the main `Rcoil` object, the `ExecutionDirector`, and the `Request` object.

```javascript
var rcoil = require('rcoil');

var Rcoil = rcoil.Rcoil;
var ExecutionDirector = rcoil.ExecutionDirector;
var Request = rcoil.Request;
var ConsoleLogger = rcoil.ConsoleLogger;
```

Once you have imported the module you can setup the first Rcoil

```javascript
var coil = new Rcoil();

coil
  // start a new group of requests, these will be executed simultaneously
  .startGroup("firstRequestGroup") 
    .addRequest(Request.get("firstSimultaneousRequest", "http://localhost:3000/users"))
    .addRequest(Request.get("secondSimultaneousRequest", "http://localhost:3000/pets"))
    // adds a child group to the firstRequestGroup. These requests will be executed 
    // once the requests from the firstRequestGroup are completed.
  .startGroup("childRequestGroup")
    .addRequest(
      Request.post("createPetRequest", "http://localhost:3000/pets")
        // this callback is executed when the createPetRequest needs an input body.
        // the context variable contains all of the requests and responses from the
        // previous calls 
        .onInput(function(context) {
          var responseData = JSON.parse(context.responseData("firstRequestGroup", "firstSimultaneouRequest").body);
          return responseData.id;
        });
    );
    
var director = new ExecutionDirector(coil, {
  logger: new ConsoleLogger(),
  debug: true
});

// The callback function is called once the director has finished executing the coil
director.start(function(context) {
  var responseData = context.responseData("childRequestGroup", "createPetRequest");
  var output = JSON.parse(responseData.body);
        
  lambdaContext.succeed(output);
});
```

## The Rcoil object
Rcoil is the main data structure that contains all of the request groups and their requests. Data within the `Rcoil` object is stored as a tree inside the `calls` array. The `calls` property is an array of request groups. Request group in turn can contain multiple `Request` objects and other groups in the children property.

```javascript
var requestGroup = {
  id: "requestGroupId",
  requests: [],
  children: []
};
```

Each request group can contain multiple request groups. All of the children of a request group will be executed simultaneously.

The `Rcoil` object exposes the `startGroup` method to begin a new group. The new group is added as a child of the current group being manipulated. Starting a group with an empty `Rcoil` object will result in this structure:
```javascript
var calls = [
  {
    id: "group1",
    requests: [],
    children: []
  }
]```
Starting another group right after the first one will add a new group as a child to the one just created.
```javascript
var calls = [
  {
    id: "group1",
    requests: [],
    children: [
      {
        id: "group2",
        requests: [],
        children: []
      }
    ]
  }
]
```

If we called startGroup again now we'd be adding a children to the "group2" group. If we want to add a new group as a child of "group1", at the same level as "group2", we can use the `afterGroup("group1")` method. This will reset the position of tree walker to "group1".

```javascript
var calls = [
  {
    id: "group1",
    requests: [],
    children: [
      {
        id: "group2",
        requests: [],
        children: []
      },
      {
        id: "group3",
        requests: [],
        children: []
      }
    ]
  }
]
```

With this structure the `ExecutionDirector` would first execute "group1", and then run "group2" and "group3" simultaneously.

To create this structure with the object we would do:
```javascript
var coil = new Rcoil();
coil
  .startGroup("group1")
    .startGroup("group2")
  .afterGroup("group1")
    .startGroup("group3");
```
    
You can use the `printCoil` method to show the structure of the coil in a readable format in the console

```javascript
coil.printCoil();
```
    
## The Request object
Request groups in the `Rcoil` object contain requests. The `Request` object represents an individual call to an HTTP method or AWS Lambda function. The `Rcoil` object exposes the `addRequest(request)` method which inserts a request in the current group.

Request objects can be initialized with a simple url, or with a full configuration structure

```javascript
// using a simple url
Request.get("firstSimultaneousRequest", "http://localhost:3000/users")

// passing the configuration object
Request.get("firstSimultaneousRequest", {
  host: "myapi.com",
  path: "/test",
  port: "80",
  protocol: "http:",
  method: "GET"
});
```

Requests can also interact with AWS Lambda functions.

```javascript
Request.lambda("firstLambdaRequest", "arn:aws:lambda:us-west-2:account-id:function:FunctionName");

// you can also pass a version or alias qualifier 
Request.lambda("firstLambdaRequest", "arn:aws:lambda:us-west-2:account-id:function:FunctionName", "prod");
```

The `onInput` callback triggered before each request. Use the `onInput` callback to generate a request
body for the backend. The `ExecutionContext` is passed to the function, all previous requests and responses
are available in the context object.

```javascript
request.onInput(function(context, requestObject) {
  var responseData = JSON.parse(context.responseData("firstRequestGroup", "firstSimultaneouRequest").body);
  
  // you can manipulate the http.ClientRequest object to inject custom headers
  requestObject.setHeader("x-custom-auth", responseData.authToken);
  
  // return the body for the request. This can be an Object or a string.
  var newRequest = {
    id: responseData.id,
    staticValue: "value"
  };
  return newRequest; 
});
```

## The ExecutionContext object
The ExecutionContext object is used throughout the execution of a coil to track all requests sent and responses received. The object is passed to all callbacks, such as the `onInput` callback for requests, and events.

The `ExecutionContext` object uses a mutex to synchronize access to the requests and response structures. For this reason the data should only be accessed through the `requestData` and `responseData` methods. Requests and responses contain all of the data sent and received including headers and status codes.

```javascript
// get the request data for a particular request
var request = context.requestData("requestGroupId", "requestName");
// the request object looks like this:
// {
//   config: requestConfig,
//   body: "requestBodyString",
//   startTime: timestamp,
//
//   // if it's an HTTP request then it will also contain the following values
//   headers: {},
//   url: "http://myurl.com",
//   method: "GET"
// }

var response = context.responseData("requestGroupId", "requestName");
// the response object looks like this:
// {
//   body: "responseBodyString",
//   endTime: timestamp,
//
//   // if it's an HTTP request then it will also contain the following values
//   headers: {},
//   httpVersion: "http://myurl.com",
//   method: "GET",
//   statusCode: 200,
//   statusMessage: "",
//
//   // if it's a Lambda request
//   err: "Error message from Lambda"
// }
```

## The ExecutionDirector object
The `ExecutionDirector` object takes an `Rcoil` structure and executes all of the requests in the correct order. Throughout the execution state is kept in the `ExecutionContext` object. The context is passed to all callbacks to allow access to all data exchanged, including requests and responses.

The constructor for the `ExecutionDirector` receives an `Rcoil` object as well as a set of options. The `start` method begins the execution of a coil once the director is initialized. The `start` method can receive a callback. The callback is triggered once the execution is completed and receives the populated `ExecutionContext`. 

```javascript
var director = new ExecutionDirector(coil, {
  logger: new ConsoleLogger(),
  debug: true
});
director.start(function(context) {
  // do something with the results
});
```

### Events
The `ExecutionDirector` object exposes a number of events to manage the lifcycle of an execution.

| Event | Parameters | Description |
|-------|------------|-------------|
| abort | context | abort is triggered when a program calls the `abort` method of the `ExecutionDirector`, and all active requests complete their execution. |
| groupStart | group, context | groupStart is triggered when the director starts executing a request group. The event is passed the request group object as well as the `ExecutionContext` populated with all requests executed so far. |
| groupEnd | group, context | groupEnd is triggered when the director completes the execution of a group. The event is passed the request group object as well as the `ExecutionContext` populated with all requests executed so far. |
| requestStart | groupId, request, context | requestStart is triggered when the `RequestPlayer` starts the execution of a request. The event is passed the groupId that the request belongs to, the `Request` object, and the `ExecutionContext`. |
| requestEnd | groupId, request, context | requestEnd, is triggered when the `RequestPlayer` completes the execution of a request. The event is passed the groupId that the request belongs to, the `Request` object, and the `ExecutionContext`. |

Use the `on` method to subscribe to events.

```javascript
director.on("requestStart", function(groupId, request, context) {
  if (request.name == "firstSimultaneousRequest") {
    // do something
  } 
});
```
