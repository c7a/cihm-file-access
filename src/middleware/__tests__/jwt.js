const Koa = require('koa');
const http = require('http');
const request = require('supertest');
const nJwt = require('njwt');

const secrets = require('../../../test/config').secrets;

let jwts = {
  full: nJwt.create({}, secrets[1]),
  oocihmOnly: nJwt.create({ uids: '^oocihm\.' }, secrets[1]),
  txtOnly: nJwt.create({ files: '\.txt$' }, secrets[1]),
  otherKey: nJwt.create({}, secrets[2])
};

jwts.expired = nJwt.create({}, secrets[1]);
jwts.expired.setExpiration(new Date('2017-01-01'));

const jwt = require('../jwt');

const app = new Koa();
app.context.config = { secrets };

app.use(jwt());

// let's assume for testing purposes that credentialed requests get 200
app.use(ctx => { ctx.status = 200; });

it('throws 401 when lacking credentials', () => {
  return request(http.createServer(app.callback()))
    .get('/foo')
    .expect(401);
});

it('validates full credentials', () => {
  return request(http.createServer(app.callback()))
    .get('/foo')
    .set('Authorization', `C7A2 Key=1,Token=${jwts.full.compact()}`)
    .expect(200);
});

it('validates full credentials using query string parameters', () => {
  return request(http.createServer(app.callback()))
    .get(`/foo?key=1&token=${jwts.full.compact()}`)
    .expect(200);
});

it('validates uid-specific credentials', () => {
  return request(http.createServer(app.callback()))
    .get('/oocihm.01096/foo.txt')
    .set('Authorization', `C7A2 Key=1,Token=${jwts.oocihmOnly.compact()}`)
    .expect(200);
});

it('rejects uid-specific credentials', () => {
  return request(http.createServer(app.callback()))
    .get('/ooe.19191/foo.txt')
    .set('Authorization', `C7A2 Key=1,Token=${jwts.oocihmOnly.compact()}`)
    .expect(403);
});

it('validates file-specific credentials', () => {
  return request(http.createServer(app.callback()))
    .get('/oocihm.01096/foo.txt')
    .set('Authorization', `C7A2 Key=1,Token=${jwts.txtOnly.compact()}`)
    .expect(200);
});

it('rejects file-specific credentials', () => {
  return request(http.createServer(app.callback()))
    .get('/ooe.19191/foo.pdf')
    .set('Authorization', `C7A2 Key=1,Token=${jwts.txtOnly.compact()}`)
    .expect(403);
});

it('rejects JWTs from incorrect keys', () => {
  return request(http.createServer(app.callback()))
    .get('/ooe.19191/foo.pdf')
    .set('Authorization', `C7A2 Key=1,Token=${jwts.otherKey.compact()}`)
    .expect(401);
});

it('throws 401 when JWT is expired', () => {
  return request(http.createServer(app.callback()))
    .get('/foo')
    .set('Authorization', `C7A2 Key=1,Token=${jwts.expired.compact()}`)
    .expect(401);
});
