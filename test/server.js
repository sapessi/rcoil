var express = require("express");
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());

app.get("/users", function(req, res) {
  res.send([
    { 
      username : "user1",
      password: "xxxxx" 
    },
    { 
      username : "user2",
      password: "xxxxx" 
    },
    { 
      username : "user3",
      password: "xxxxx" 
    }
  ]);
});

app.get("/users/user1", function(req, res) {
  res.send({ 
    username : "user1",
    password: "xxxxx", 
    address: [
      "the rainy corner",
      "42 Galaxy way",
      "planet earth"
    ]
  });
});

app.post("/users", function(req, res) {
  res.send({
    id: req.body.id
  });
});

app.get("/headers", function(req, res) {
  res.send({
    headers: req.headers
  });
});

module.exports = function() {
  app.listen(3000);  
}