var supertest = require('supertest');

describe('Users', function () {

  var loopback;
  var app;
  var api;

  before(function () {
    loopback = require('loopback');
    app = require('..');
    app.use(loopback.rest());
    api = supertest(app);
  });

  it('errors if login does not exist', function (done) {
    api.post("/Users/login")
      .set('Content-Type', 'application/json')
      .send('{"email": "john@acme.com", "password": "doe"}')
      .expect(401)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can register a user', function (done) {
    api.post("/Users")
      .set('Content-Type', 'application/json')
      .send('{"email": "john@acme.com", "username": "john", "password": "doe"}')
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can login with proper credentials', function (done) {
    api.post("/Users/login")
      .set('Content-Type', 'application/json')
      .send('{"email": "john@acme.com", "password": "doe"}')
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });
});