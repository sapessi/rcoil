var expect = require("chai").expect;

var Rcoil = require('../src/rcoil');
var ExecutionDirector = require('../src/execution-director');
var R = require('../src/request');
var DevNullLogger = require('../src/devnull-logger');
var server = require("./server");

server();

function singleCallCoil(groupName, requestName) {
  var coil = new Rcoil();
  coil.startGroup(groupName).addRequest(R.get(requestName, "http://localhost:3000/users"));
  var director = new ExecutionDirector(coil, {
    logger: new DevNullLogger(),
    debug: true
  });
  return director;
}

function sequentialCallCoil() {
  var coil = new Rcoil();
  coil.startGroup("group1").addRequest(R.get("request1", "http://localhost:3000/users"));
  coil.startGroup("group2").addRequest(R.get("request2", "http://localhost:3000/users/user1"));
  var director = new ExecutionDirector(coil, {
    logger: new DevNullLogger(),
    debug: true
  });
  return director;
}


describe("Test Rcoil against local express server", function () {
  describe("Users API", function () {
    it("calls a single api", function () {
      var director = singleCallCoil("first", "local");
      director.start(function (context) {
        var responseData = context.requestData("first", "local");
        var output = JSON.parse(responseData.body);

        expect(output.length).to.equal(3);
      });
    });
    it("group with space in id", function() {
      var director = singleCallCoil("first group with space", "local");
      director.start(function(context) {
        var responseData = context.requestData("first group with space", "local");
        var output = JSON.parse(responseData.body);

        expect(output.length).to.equal(3);
      });
    });
    it("request with space in id", function() {
      var director = singleCallCoil("first group with space", "local request");
      director.start(function(context) {
        var responseData = context.requestData("first group with space", "local request");
        var output = JSON.parse(responseData.body);

        expect(output.length).to.equal(3);
      });
    });
    it("sequential requests", function() {
      var director = sequentialCallCoil();
      
      director.on("groupStart", function(group, context) {
        if (group.id == "group1") {
          expect(context.requestData("group2", "request2")).to.be.null;
        }
        if (group.id == "group2") {
          expect(context.requestData("group1", "request1")).not.to.be.null;
        }
      });
      director.start(function(context) {
        var responseData = context.responseData("group2", "request2");
        var output = JSON.parse(responseData);
        expect(output.username).to.equal("user1");
      });
    });
    it("Custom headers in request", function() {
      var coil = new Rcoil();
      coil.startGroup("test").addRequest(
        R.get("test", "http://localhost:3000/users").onInput(function(context, request) {
        request.setHeader("x-custom", "custom");
        return null;
      }));
      var director = new ExecutionDirector(coil, {
        logger: new DevNullLogger(),
        debug: true
      });
      director.start(function(context) {
        var body = JSON.parse(context.responseData("test", "test"));
        expect(body.headers["x-custom"]).not.to.be.null;
      });
      
    })
  });
});