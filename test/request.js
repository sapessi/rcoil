var expect = require("chai").expect;

var R = require("../src/request");

var apiUrl = "http://api.com/test";

describe("Test request object", function() {
  describe("Static utility functions", function() {
    it("Create a request with wrong url", function() {
      var fn = function() { R.get("test", "resd/asd*ads") };
      expect(fn).to.throw(Error);
    });
    it("Creates a GET request", function() {
      var req = R.get("test", apiUrl);
      expect(req).not.to.be.null;
      expect(req.settings.method).to.equal(R.HttpVerb.GET);
      expect(req.name).to.equal("test");
      expect(req.settings.host).to.equal("api.com");
    });
    it("Creates a POST request", function() {
      var req = R.post("test", apiUrl);
      expect(req.settings.method).to.equal(R.HttpVerb.POST);
    });
    it("Request with invalid configuration", function() {
      var fn = function() { R.get("test", {
        host: "api.com",
        method: "GET"
      })};
      expect(fn).to.throw(Error);
    });
    it("Set input function", function() {
      var req = R.get("test", "http://api.com/test").onInput(function(context, requestData) {
        var data = context.requestData("test", "test");
        return null;
      });
      
      expect(req.inputFunc).not.to.be.null;
    });
    it("Lambda function setup", function() {
      var lambdaArn = "arn:aws:xxxxxxxx:lambda:asd";
      var qualifier = "dev"
      var req = R.lambda("test", lambdaArn, qualifier);
      
      expect(req.settings.function).to.equal(lambdaArn);
      expect(req.settings.qualifier).to.equal(qualifier);
    });
    it("Lambda function without qualifier", function() {
      var lambdaArn = "arn:aws:xxxxxxxx:lambda:asd";
      var req = R.lambda("test", lambdaArn);
      
      expect(req.settings.function).to.equal(lambdaArn);
      expect(req.settings.qualifier).to.equal("$LATEST");
    });
  });
});