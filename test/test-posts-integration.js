'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

// this makes the expect syntax available throughout
// this module
const expect = chai.expect;

const { BlogPost  }  = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');
const { seedData } = require('../seed-data');

chai.use(chaiHttp);

function generatePostData() {
    return  {"title": "New Blog Post", "author": {"firstName": "Jason", "lastName": "Vance"}, "content": "New Post Content"}

}

function seedPostData() {
    console.info('seedingpost data');       
    // this will return a promise
    return BlogPost.insertMany(seedData);
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
  }

describe ('BlogPosts API recsource', function () {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedPostData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {
        it ('should return all existing posts', function () {
            let res;
            return chai.request(app)
            .get('/posts')
            .then(function(_res) {
                res = _res;                
                expect(res).to.have.status(200);
                expect(res.body).to.have.lengthOf.at.least(1);
                return BlogPost.count()
            })
            .then(count => {
                expect(res.body).to.have.lengthOf(count);
            })
        });

        it ('should return post with correct fields', function() {
            let resPost;
            return chai.request(app)
            .get('/posts')
            .then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.a('array');
                expect(res.body).to.have.lengthOf.at.least(1);
                res.body.forEach(function(post) {
                    expect(post).to.be.a('object');
                    expect(post).to.include.keys('id', 'author', 'title', 'content', 'created');
                });
                resPost = res.body[0];
                return BlogPost.findById(resPost.id);
            })
            .then(function(post) {
                expect(post.id).to.equal(resPost.id);
                expect(post.authorName).to.equal(resPost.author);
                expect(post.title).to.equal(resPost.title);
                expect(post.content).to.equal(resPost.content);                
            })
        });
    });

    describe('POST endpoint', function() {
        it ('should add a new post', function() {
            const newPost = generatePostData();
            return chai.request(app)
            .post('/posts')
            .send(newPost)
            .then(function(res) {
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.a('object');
                expect(res.body).to.include.keys('id', 'author', 'title', 'content', 'created');
                expect(res.body.id).to.not.be.null;
                return BlogPost.findById(res.body.id);
            })
            .then(function(post) {                
                expect(post.authorName).to.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
                expect(post.title).to.equal(newPost.title);
                expect(post.content).to.equal(newPost.content);   
            })
        })
    });

    describe('DELETE endpoint', function() {
       it ('should delete a post', function() {
            let post;
            return BlogPost.findOne()
            .then(function(_post) {
                post = _post;
                return chai.request(app).delete(`/posts/${post.id}`)
            })
            .then(function(res) {
                expect(res).to.have.status(204);
            })
       })
    });

    describe('PUT endpoint', function() {
        
        it('should update fields sent', function() {
          const updateData = {
            title: 'Updated Title',
            content: 'Updated Content'
          };
    
          return BlogPost
            .findOne()
            .then(function(post) {
              updateData.id = post.id;
                  
              return chai.request(app)
                .put(`/posts/${post.id}`)
                .send(updateData);
            })
            .then(function(res) {
              expect(res).to.have.status(204);
    
              return BlogPost.findById(updateData.id);
            })
            .then(function(post) {
              expect(post.title).to.equal(updateData.title);
              expect(post.content).to.equal(updateData.content);
            });
        });
      });


});