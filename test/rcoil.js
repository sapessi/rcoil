var expect = require("chai").expect;

var Rcoil = require("../src/rcoil");
var R = require("../src/request");

// new coil
var coil = new Rcoil();

describe("Rcoil tree structure", function() {
  describe("Start a tree structure", function() {
    it("Adds a request without creating a group", function() {
      var fn = function() { coil.addRequest(R.get("test", "http://api.com/test")) };
      expect(fn).to.throw(Error);
    });
    it("Start a new group", function() {
      coil = coil.startGroup("testGroup");
      expect(coil._tmpPositionId).to.equal("testGroup");
      expect(coil.calls[0].id).to.equal("testGroup");
    });
    it("Looks up request group in a simple tree", function() {
      expect(coil._findRequestGroup(coil.calls, "testGroup")).not.to.be.null;
    });
    it("Looks up a non existing request group", function() {
      expect(coil._findRequestGroup(coil.calls, "testGroupFake")).to.be.null;
    });
    it("Add a request", function() {
      coil = coil.addRequest(R.get("test", "http://api.com/test"));
      expect(coil.calls[0].requests[0]).not.to.be.null;
      expect(coil.calls[0].requests[0].type).to.equal(R.RequestType.HTTP);
    });
    it("Count of request groups", function() {
      coil.startGroup("secondGroup");
      expect(coil._tmpPositionId).to.equal("secondGroup");
      expect(coil._totalRequestGroups).to.equal(2);
    });
    it("Lookup request in a 2 level tree", function() {
      expect(coil._findRequestGroup(coil.calls, "secondGroup")).not.to.be.null;
    });
    it("Verify tree structure", function() {
      expect(coil.calls[0].children.length).to.equal(1);
      expect(coil.calls[0].children[0].id).to.equal("secondGroup");
    });
    it("Create empty group", function() {
      var group = coil._createEmptyRequestGroup("empty");
      expect(group).to.be.instanceof(Object);
      expect(group.id).to.equal("empty");
      expect(group.requests).to.be.instanceof(Array);
      expect(group.requests.length).to.equal(0);
      expect(group.children).to.be.instanceof(Array);
      expect(group.children.length).to.equal(0);
    });
    it("Send invalid request object", function() {
      var fn = function() {
        coil.addRequest({hello:"World"});
      }
      expect(fn).to.throw(Error);
    });
    it("Reset position", function() {
      coil.fromTheBeginning();
      expect(coil._tmpPositionId).to.equal("");
    });
    it("Group count", function() {
      var count = coil.requestGroupsCount()
      expect(count).to.equal(2);
    });
  });
});