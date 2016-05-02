var Twitter = require('twitter');
var mongodb = require('mongodb');
var pg = require('pg');
pg.defaults.ssl = true;
var connectionString = 'postgres://zqjwdkhttstwfx:ykFbgDKz8eTpXM3CCyim6Zyw-m@ec2-54-235-246-67.compute-1.amazonaws.com:5432/d43r3ued3buhe1';
var client = new pg.Client(connectionString);
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13';
var history = [];
var running = false;
module.exports = {
	read: function(manualRunning) {

		var currentQueCounter = 0;
		if (manualRunning === false) {
			running = false;
			clearInterval(currentQue);
			clearInterval(messagePull);
		} else {
		running = true;
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
	            pullMessages();
	            done();
	        });
	    }); // pg connect
	    // Called to filter incoming messages on twitter
	    function filter(splitMessage) {
		    var filters = ["FAV", "FAVS", "RTS", "RT\'S", "RETWEETS", "RT", "RTS,", "FAVS,", "RTS!", "RT,", "FAVORITES", "RTS?FAVS!"];
		    for (i = 0; i < filters.length; i++) {
		        if (splitMessage.indexOf(filters[i]) > -1) {
		            return true;
		        }
		    }
		}
		// Filters messages on twitter
		function lmkwdFilter(splitMessage) {
		    var filters = ["LMKWD", "GET"];
		    for (i = 0; i < filters.length; i++) {
		        if (splitMessage.indexOf(filters[i]) > -1) {
		            return true;
		        }
		    }
		}

		function done(splitMessage) {
			var filters = ["D", "D20", "D15", "DONE", "D!", "D,"];
			for (i = 0; i < filters.length; i++) {
		        if (splitMessage.indexOf(filters[i]) > -1) {
		            return true;
		        }
		    }
		}
		// Starts the forEach on each account to pull messages from twitter
	    function pullMessages() {
	    	accounts.forEach(function(account) {
	    		var client = new Twitter ({
	    			consumer_key: account.consumer_key,
	    			consumer_secret: account.consumer_secret,
	    			access_token_key: account.access_token,
	    			access_token_secret: account.access_token_secret,
	    			timeout_ms: 60 * 1000
	    		});
	    		if (account.last_message === null) {
	    			client.get('direct_messages', { count: 20 }, function(err, messages, response) {
		    			if (err) {
		    				console.log("direct_messages", err);
		    			} else {
		    				pg.connect(connectionString, function(err, client, done) {
		    					if(err) {
		    						done();
		    						console.log(err);
		    					} else {
		    						var query = client.query("UPDATE manualaccounts SET last_message =" + "'" + messages[0].id_str + "'" + "WHERE username =" + "'" + account.username + "'");
		    						done();
		    					}
		    				});
		    				messages.forEach(function(message) {
		    					var splitMessage = message.text.toUpperCase().split(" ");
							    if (filter(splitMessage)) {
							    	var sender = message.sender.screen_name
							    	// Call function to add sender to account que
							    	pushSender(sender, account);
							    }

							    if (lmkwdFilter(splitMessage)) {
							    	var sender = message.sender.screen_name

							    	messageSirBryan(sender);
							    }

		    				});
		    			}
		    		}); // client.get
	    		} else {
		    		client.get('direct_messages', { since_id: account.last_message }, function(err, messages, response) {
		    			if (err) {
		    				console.log("direct_messages", err);
		    			} else {
		    				if (messages.length < 1) {
		    					console.log("No New Messages");
		    				} else {
			    				console.log("Pulled New Messages...");
			    				pg.connect(connectionString, function(err, client, done) {
			    					if(err) {
			    						done();
			    						console.log(err);
			    					} else {
										var query = client.query("UPDATE manualaccounts SET last_message =" + "'" + messages[0].id_str + "'" + "WHERE username =" + "'" + account.username + "'");			    					}
										done();
			    				});
			    				messages.forEach(function(message) {
			    					var splitMessage = message.text.toUpperCase().split(" ");
								    if (filter(splitMessage)) {
								    	var sender = message.sender.screen_name
								    	// Call function to add sender to account que
								    	pushSender(sender, account);
								    }
			    				});
		    				}
				    	}
		    		}); // client.get
	    		} //last message null else
	    	}); // forEach
	    }
		function pushSender(sender, account) {
			MongoClient.connect(url, function(err, db) {
				if (err) {
					console.log("Unable to connect to Mongo. Error: ", err);
				} else {
					var collection = db.collection('accounts');
						collection.find( { _id: account.username } ).toArray(function(err, result) {
							if (err) {
								console.log(err);
							} else {
								var query = result[0].children;
								if (query.indexOf(sender) > -1) {
									console.log("Sender already qued!");
								} else {
										if (blacklistFilter(sender)) {
											console.log("Account On Blacklist...");
										} else {
											collection.update(
												{ _id:  account.username },
												{ $push: { children: sender } }
											) // Add sender to que
											console.log("New Senders Added To Que!");
										}
								}
								db.close();
								}
						});
				} // else
			}); // MongoClient
		} // pushSender
	}, 1000 * 65 * 1); // Message Pull set Interval
		console.log("currentQue Started!");
		// Main Set Interval
		currentQue = setInterval(function() {
			var accounts = [];
			// Get a Postgres client from the connection pool
			// I have this here because Node said accounts was not defined... even though it was.
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
		        	pullTraders(accounts);
		            done();
		        });
		    }); // pg connect
		    // End postgres query
		    // called when pg query is done
		    function pullTraders(accounts) {
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
										var currentTrader = result[0].children[0];
											if (result[0].children.length < 1) {
												console.log("No accounts currently in que for: " + result[0]._id);
											} else {
												db.close();
													var time = new Date();

														if (time.getHours() >= 1 && time.getHours() < 11) {
															console.log("Offline: Night Time");
														} else {
															initiateTrade(account, currentTrader);
														}
														
											}
									} // else
								}) // Grab current trader from que
						}
					}); // MongoClient
				});
			}
		}, 1000 * 60 * 20);
		// Start the actual trade with each account
		function initiateTrade(account, currentTrader) {
			console.log("Iniated Trade for account: ", account);
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
                            // If getting Traders favorites results in a 404
	                            MongoClient.connect(url, function(err, db) {
									if (err) {
										console.log("Unable to connect to Mongo. Error: ", err);
									} else {
										var collection = db.collection('accounts');
										collection.update(
											{ _id:  account.username },
											{ $pull: { children: currentTrader } }
										) // Remove current trader from que upon completion
										console.log("Account does not exist via Twitter - Removed from Que...");
										db.close();
									}
								}); // MongoClient
                          } else {
                          		var foo = [];
                          		tweets.forEach(function(tweet) {
                          			foo.push(tweet);
                          		});
                          		if (foo.length !== 3) {
                          			var messageParams = { screen_name: 'sirbryanthewise', text: "Missing Retweets for account: " + currentTrader };
							    	// Confirm D20 message to sender
									client.post('direct_messages/new', messageParams, function(err, message, response) {
										if (err) {
											console.log(err);
										} else {
											console.log("Missing RT Message Sent!");
										}
									});
                          		}
                          		var completeRetweetCount = 0;
								tweets.forEach(function(tweet) {
									completeRetweetCount++;
									if (completeRetweetCount === tweets.length - 1) {
										messageSender(currentTrader);
										addToLmkwdList(currentTrader, account);
										lmkwdInterval(currentTrader, client, account);
									}
									client.post('statuses/retweet/' + tweet.id_str, function(err, tweet, response) {
										if (err) {
											console.log("Statuses/retweet", err);
										} else {
											MongoClient.connect(url, function(err, db) {
													if (err) {
														console.log("Unable to connect to Mongo. Error: ", err);
													} else {
														var collection = db.collection('accounts');
														collection.update(
															{ _id:  account.username },
															{ $pull: { children: currentTrader } }
														) // Remove current trader from que upon completion
														console.log("Retweet Complete.");
													}
											}); // MongoClient
                                    // Start coutdown to undo the trade
											setTimeout(function() {
												client.post('statuses/destroy/' + tweet.id_str, function(err, tweet, response) {
													if (err) {
														console.log("statuses/destroy: ", err);
													} else {
														console.log("Unretweet Complete.");
													}
												});
											}, 1000 * 60 * 19.7); // Destroy retweet
										}
									}); // retweet post
								}); // tweets for each
	                          }
             });
			function messageSender(currentTrader) {
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
		} // Initiate Trade
		} // else

		// When We Send D20, Add Account To LMKWD List
		function addToLmkwdList(currentTrader, account) {
			MongoClient.connect(url, function(err, db) {
					if (err) {
						console.log("Unable to connect to Mongo. Error: ", err);
					} else {
						var collection = db.collection('accounts');
						collection.update(
							{ _id:  account.username },
							{ $push: { lmkwd: [
											{
												username: [
													currentTrader,
													account.last_message
												]
											}
										] 
									}
							}
						) // Remove current trader from que upon completion
						console.log("Account Added To lmkwd List");
					}
			}); // MongoClient
		}

		// Called every 6 hours
		function lmkwdInterval(currentTrader, client, account) {
			lmkInterval = setInterval(function() {
				console.log("6 Hour Countdown Started.")
				// Get the last message ID
				MongoClient.connect(url, function(err, db) {
						if (err) {
							console.log("Unable to connect to Mongo. Error: ", err);
						} else {
							var collection = db.collection('accounts');
							var possibilities = collection.findOne( { _id:  account.username } ).lmkwd; // Remove current trader from que upon completion
							console.log("Account Added To lmkwd List");
							getLastDoneMessages(possibilities, currentTrader, client, account);

						}
				}); // MongoClient
			}, 1000 * 60 * 60 * 6);
		}

		function getLastDoneMessages(possibilities, currentTrader, client, account) {



			client.get('direct_messages', { since_id: account.last_message }, function(err, messages, response) {
    			if (err) {
    				console.log("direct_messages", err);
    			} else {
    				if (messages.length < 1) {
    					console.log("No New Messages From 6 Hour");
    				} else {
	    				messages.forEach(function(message) {
	    					var splitMessage = message.text.toUpperCase().split(" ");
						    if (done(splitMessage)) {
						    	console.log("DONE");
						    }
	    				});
    				}
		    	}
    		}); // client.get
		}

		// Check If Sender Exists In Idle History Every 12 Hours
		function inIdleHistory() {
			// Every 12 hours, I'm called.
			// 
		}

		// Add New Sender To Idle History
		function addToIdleHistory(currentTrader) {

			// Check if currentTrader is in history already --
			// If so, remove them...
			// If not, add them to history

			// Start 12 hour clock, if currentTrader is in history, message them 'rts'

		}

		function blacklistFilter(sender) {
			MongoClient.connect(url, function(err, db) {
				if (err) {
					console.log("Unable to connect to Mongo. Error: ", err);
				} else {
					var collection = db.collection('blacklist');
						collection.find( { _id:  sender } ).toArray(function(err, result) {
							if (err) {
								console.log(err);
							} else {
								if (result.length > 0) {
									console.log("Account Blacklisted!");
									return true
								} else {
									console.log(".");
								}
							} // else
						}); // Grab current trader from que
				}
			}); // MongoClient
		} // blacklistFilter


		function messageSirBryan(sender) {
			var messageParams = { screen_name: 'sirbryanthewise', text: "LMKWD or GET sent by" + sender };
	    	// Confirm D20 message to sender
			client.post('direct_messages/new', messageParams, function(err, message, response) {
				if (err) {
					console.log(err);
				} else {
					console.log("Messages Bryan.");
				}
			});
		}

	} // read: function()
}


// NOTES --------------------------

// db.accounts.update( { _id: 'DiyNaiis' }, { $push: { lmkwd: { 'username': [ '1243787273424' ] } } });

