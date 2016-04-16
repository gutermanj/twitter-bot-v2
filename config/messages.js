var Twitter = require('twitter');
var mongodb = require('mongodb');
var pg = require('pg');

pg.defaults.ssl = true;

var connectionString = 'postgres://zqjwdkhttstwfx:ykFbgDKz8eTpXM3CCyim6Zyw-m@ec2-54-235-246-67.compute-1.amazonaws.com:5432/d43r3ued3buhe1';

var client = new pg.Client(connectionString);

var MongoClient = mongodb.MongoClient;

var url = 'mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13';

var history = [];

// Every 24 hours remove trade history
var c = 0;

setInterval(function() {

	if (c > 23) {
		pg.connect(connectionString, function(err, client, done) {

	      if(err) {
	        done();
	        console.log(err);
	        return res.status(500).json({ success: false, data: err });
	      }

	      var deleteHistory = client.query("DELETE FROM history");

	      deleteHistory.on('end', function() {
	        done();
	        
	      });
	  	});
		console.log("Cleared Trader History.");
	} else {
		c++;
	}

}, 1000 * 60 * 60);

var running = false;

console.log("RUNNING: ", running);

module.exports = {

	read: function(manualRunning) {

		var currentQueCounter = 0;


		if (manualRunning === false) {
			
			running = false;
			clearInterval(currentQue);
			clearInterval(messagePull);

			console.log("Proccess Stopped!");

		} else {

		running = true;

		console.log("STATUS: ", running);

		messagePull = setInterval(function() {

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




	    function filter(splitMessage) {
   
		    var filters = ["FAV", "FAVS", "RTS", "RT\'S", "RETWEETS", "RT"];
		   
		    for (i = 0; i < filters.length; i++) {
		   
		        if (splitMessage.indexOf(filters[i]) > -1) {
		            return true;
		        }
		   
		    }
		}

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

	    		client.get('direct_messages', { count: 10 }, function(err, messages, response) {

	    			if (err) {
	    				console.log("direct_messages", err);
	    			} else {

	    				console.log("Pulled Direct Messages...");;

	    				messages.forEach(function(message) {

	    					var splitMessage = message.text.toUpperCase().split(" ");

	    					
   
						    if (filter(splitMessage)) {

						    	var sender = message.sender.screen_name

						    	// Call function to add sender to account que
						    	pushSender(sender, account);

						    }

	    				});

	    			}

	    		}); // client.get
	    		
	    	}); // forEach



	    }




		function pushSender(sender, account) {

			MongoClient.connect(url, function(err, db) {

				if (err) {
					console.log("Unable to connect to Mongo. Error: ", err);
				} else {

					var collection = db.collection('accounts');

					MongoClient.connect(url, function(err, db) {

					collection.find( { _id: account.username } ).toArray(function(err, result) {
						if (err) {
							console.log(err);
						} else {
							var query = result[0].children;

							if (query.indexOf(sender) > -1) {
						console.log("Sender already qued!");
							} else {

								var history = [];

								 pg.connect(connectionString, function(err, client, done) {

								      if(err) {
								        done();
								        console.log(err);
								        return res.status(500).json({ success: false, data: err });
								      }

								      var usernames = client.query("SELECT * FROM history");

								      usernames.on('row', function(row) {
								        history.push(row);
								      });

								      usernames.on('end', function() {
								      	checkHistory(history);
								        done();
								      });

								 }); // pg.connect
								function checkHistory(history) {
									if (history.indexOf(sender) > -1) {
										console.log("Sender traded with within 24 hours.");
									} else {
										collection.update(
											{ _id:  account.username },
											{ $push: { children: sender } }
										) // Add sender to que

										console.log("New Senders Added To Que!");
									}
								}

							} // else
						}
					});

					});

					

				} // else

			}); // MongoClient

		} // pushSender

	}, 1000 * 60 * 3);

		currentQueCounter++;

		currentQue = setInterval(function() {

			

			accounts.forEach(function(account) {

				MongoClient.connect(url, function(err, db) {

				if (err) {
					console.log("Unable to connect to Mongo. Error: ", err);
				} else {

					var collection = db.collection('accounts');

					collection.find( { _id:  account.username } ).toArray(function(err, result) {
						
						if (err) {
							console.log(err);
						} else {
							console.log(result);

							var currentTrader = result[0].children[0];

							initiateTrade(account, currentTrader);

							history.push(currentTrader);

						} // else

					}) // Grab current trader from que

				}

			}); // MongoClient

			});

		}, 1000 * 60 * 20);



		function initiateTrade(account, currentTrader) {

			var client = new Twitter ({

	    			consumer_key: account.consumer_key,
	    			consumer_secret: account.consumer_secret,
	    			access_token_key: account.access_token,
	    			access_token_secret: account.access_token_secret,
	    			timeout_ms: 60 * 1000

	    		});

			var params = {screen_name: currentTrader, count: 3};

			client.get('favorites/list', params, function(err, tweets, response) {

                          if (err) {

                            console.log("Favorites/list: ", err);

                          } else {

                              tweets.forEach(function(tweet) {
                                client.post('statuses/retweet/' + tweet.id_str, function(err, tweet, response) {
                                  if (err) {
                                    console.log("Statuses/retweet", err);
                                  } else {
                                    console.log("Trade Started...");

                                    MongoClient.connect(url, function(err, db) {

											if (err) {
												console.log("Unable to connect to Mongo. Error: ", err);
											} else {

												var collection = db.collection('accounts');

												collection.update(
													{ _id:  account.username },
													{ $pull: { children: currentTrader } }
												) // Remove current trader from que upon completion

												console.log("Trade Complete.");

											}

									}); // MongoClient

                                    setTimeout(function() {

                                      client.post('statuses/destroy/' + tweet.id_str, function(err, tweet, response) {
                                        
                                        if (err) {
                                          console.log("statuses/destroy: ", err);
                                        } else {
                                          console.log("Trade Complete.");
                                        }

                                      });

                                    }, 1000 * 60 * 19.7); // Destroy retweet

                                  }
                                }); // retweet post
                              }); // tweets for each





	                          }

             });

			var messageParams = { screen_name: currentTrader, text: 'D20' };

	    	// Confirm D20 message to sender
			client.post('direct_messages/new', messageParams, function(err, message, response) {
				if (err) {
					console.log(err);
				} else {
					console.log("Message \'D20\' Sent!");
				}
			});

		}
	}

	} // read: function()

}