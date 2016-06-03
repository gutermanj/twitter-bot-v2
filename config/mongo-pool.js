var assert = require('assert');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13';

var mongoPool = {
	start: function() {
		MongoClient.connect(url, function(err, db) {
			assert.equal(null, err);

			var self = this;
			self.db = db;
			console.log("Successfully connected to mongo");

			// Make the db object accessible here?

		});
	}

}

module.exports = mongoPool;