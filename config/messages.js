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
	    function filter(splitMessage) {
		    var filters = ["FAV", "FAVS", "RTS", "RT\'S", "RETWEETS", "RT"];
		    for (i = 0; i < filters.length; i++) {
		        if (splitMessage.indexOf(filters[i]) > -1) {
		            return true;
		        }
		    }
		}
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
	    			client.get('direct_messages', { count: 5 }, function(err, messages, response) {
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
												console.log("No accounts currently in que for: " + result[0]._id)
											} else {
												db.close();
													var time = new Date();

														if (time.getHours() > 22 || time.getHours() < 8) {
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
									// d20Check = setInterval(function() {
									// 	pg.connect(connectionString, function(err, client, done) {
									// 	  // Error handler
									// 	  if (err) {
									// 	  	done();
									// 	    console.log(err);
									// 	  } else {
									// 	    var currentAccount = [];
									// 	    var trader = client.query('SELECT * FROM history WHERE username=(' + "'" + currentTrader + "'" + ')');
									// 	    trader.on('row', function(row) {
									// 	      currentAccount.push(row);
									// 	    });
									// 	    trader.on('end', function() {
									// 	    	done();
									// 	      if (currentAccount.d20_received !== true) {
									// 	        // Message them
									// 	        letEmKnow(currentTrader);
									// 	      } else {
									// 	        clearInterval(d20Check);
									// 	      	console.log("Trade Completed on both ends and account removed from history.");
									// 		  }
									// 		  done();
									// 	    }); // Trader on end
									// 	  }
									// 	}); // pg connect
									// }, 1000 * 60 * 60 * 6); // setInterval d20Check
									// REMOVED FOR TESTING
									// function letEmKnow(currentTrader) {
									// 	var messageParams = { screen_name: currentTrader, text: 'lmkwd' };
									// 	client.post('direct_messages/new', messageParams, function(err, message, response) {
									// 		if (err) {
									// 			console.log(err);
									// 		} else {
									// 			console.log("We let em know...");
									// 		}
									// 	});
									// }
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

	} // read: function()
}