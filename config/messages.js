var Twitter = require('twitter');
var mongodb = require('mongodb');
var pg = require('pg');

pg.defaults.ssl = true;

var connectionString = 'postgres://zqjwdkhttstwfx:ykFbgDKz8eTpXM3CCyim6Zyw-m@ec2-54-235-246-67.compute-1.amazonaws.com:5432/d43r3ued3buhe1';

var client = new pg.Client(connectionString);

var MongoClient = mongodb.MongoClient;

var url = 'mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13';

module.exports = {

	read: function() {

		var accounts = [];

			 // Get a Postgres client from the connection pool
	    pg.connect(connectionString, function(err, client, done) {
	        // Handle connection errors
	        if(err) {
	          done();
	          console.log(err);
	          return res.status(500).json({ success: false, data: err});
	        }

	        // SQL Query > Last account created
	        var query = client.query("SELECT * FROM manualAccounts");

	        // Stream results back one row at a time
	        query.on('row', function(row) {
	            accounts.push(row);
	        });

	        // After all data is returned, close connection and return results
	        query.on('end', function() {
	        	console.log(accounts);
	            pullMessages();
	            done();
	        });


	    }); // pg connect

	    function pullMessages() {

	    	console.log("Function pullMessages Started");

	    	accounts.forEach(function(account) {

	    		var client = new Twitter ({

	    			consumer_key: account.consumer_key,
	    			consumer_secret: account.consumer_secret,
	    			access_token_key: account.access_token,
	    			access_token_secret: account.access_token_secret,
	    			timeout_ms: 60 * 1000

	    		});

	    		client.get('direct_messages', { count: 5 }, function(err, messages, response) {

	    			if (err) {
	    				console.log("direct_messages", err);
	    			} else {

	    				messages.forEach(function(message) {

	    					var splitMessage = message.text.split(" ");

	    					console.log(message);
   
						    if (filter(splitMessage)) {

						    	var sender = message.sender.id

						    	// Call function to add sender to account que
						    	pushSender(sender, account);

						    }

	    				});

	    			}

	    		}); // client.get
	    		
	    	}); // forEach



	    }

	    function filter(splitMessage) {
   
		    var filters = ["fav", "favs", "rts", "rt\'s", "retweets"];
		   
		    for (i = 0; i < filters.length; i++) {
		   
		        if (splitMessage.indexOf(filters[i]) > -1) {
		            return true;
		        }
		   
		    }
		}


		function pushSender(sender, account) {

			MongoClient.connect(url, function(err, db) {

				if (err) {
					console.log("Unable to connect to Mongo. Error: ", err);
				} else {

					var collection = db.collection('accounts');

					collection.update(
						{ _id:  account.username },
						{ $push: { children: sender } }
					) // Add sender to que

					initiateTrade(sender, account);

					console.log("initiateTrade Started");

				}

			}); // MongoClient

		} // pushSender

		function initiateTrade(sender, account) {

			var client = new Twitter ({

	    			consumer_key: account.consumer_key,
	    			consumer_secret: account.consumer_secret,
	    			access_token_key: account.access_token,
	    			access_token_secret: account.access_token_secret,
	    			timeout_ms: 60 * 1000

	    	});


			var params = {screen_name: sender};

			client.get('favorites/list', { count: 3 }, params, function(err, tweets, response) {

                          if (err) {

                            console.log("Favorites/list: ", err);

                          } else {

                              tweets.forEach(function(tweet) {
                                client.post('statuses/retweet/' + tweet.id_str, function(err, tweet, response) {
                                  if (err) {
                                    console.log("Statuses/retweet", err);
                                  } else {
                                    console.log(tweet);

                                    setTimeout(function() {

                                      evenTwit.post('statuses/destroy/' + tweet.id_str, function(err, tweet, response) {
                                        
                                        if (err) {
                                          console.log("statuses/destroy: ", err);
                                        } else {
                                          console.log(tweet);
                                        }

                                      });

                                    }, 30000);

                                  }
                                }); // retweet post
                              }); // tweets for each
                          }

             });

		}



	} // read: function()

}