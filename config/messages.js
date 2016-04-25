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
	    		if (account.last_message === null) {
	    			client.get('direct_messages', { count: 5 }, function(err, messages, response) {
		    			if (err) {
		    				console.log("direct_messages", err);
		    			} else {
		    				console.log("Pulled Direct Messages...");
		    				pg.connect(connectionString, function(err, client, done) {
		    					if(err) {
		    						done();
		    						console.log(err);
		    					} else {
		    						var query = client.query("UPDATE manualaccounts SET last_message = (last_message) WHERE username = (username) values ($1, $2)", [messages[0].id_str, account.username]);
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
		    					console.log("No new messages");
		    				} else {
			    				console.log("Pulled Direct Messages...");
			    				pg.connect(connectionString, function(err, client, done) {
			    					if(err) {
			    						done();
			    						console.log(err);
			    					} else {
			    						var query = client.query('UPDATE manualaccounts SET last_message = (last_message) WHERE username = (username) values ($1, $2)', [messages[0].id_str, account.username]);
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
									      var usernames = client.query('SELECT * FROM history');
									      usernames.on('row', function(row) {
									        history.push(row.username);
									      });
									      usernames.on('end', function() {
									      	checkHistory(history, sender);
									        done();
									      });
									 }); // pg.connect
									function checkHistory(history, sender) {
												collection.update(
													{ _id:  account.username },
													{ $push: { children: sender } }
												) // Add sender to que
												console.log("New Senders Added To Que!");
										}
									}
								} // else
						});
					});
				} // else
			}); // MongoClient
		} // pushSender
	}, 1000 * 60 * 3); // Message Pull set Interval
		currentQueCounter++;
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
		        	console.log(accounts);
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
									console.log(result);
									var currentTrader = result[0].children[0];
										if (result.length < 1) {
											console.log("No accounts currently in que for: " + account)
										} else {
											initiateTrade(account, currentTrader);
										}
									// Add current Trader to local history
									pg.connect(connectionString, function(err, client, done) {
									// Handle connection errors
								        if(err) {
								          done();
								          console.log(err);
								          return res.status(500).json({ success: false, data: err});
								        } else {
								        	var addToHistory = client.query('INSERT INTO history (username, d20_received) values ($1, $2)', [currentTrader, false]);
								        }
								        addToHistory.on('end', function() {
								        	done();
								        	console.log("Account Added To History");
								        });
									});
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
                            if (error[0].code === 34) {
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
									}
								}); // MongoClient
                        	}
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
											console.log("Message \'D20\' Sent!");
										}
									});
                          		}
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
												console.log("Retweet Complete.");
												console.log("Started Interval For D20 Check.");
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
			var messageParams = { screen_name: currentTrader, text: 'D20' };
	    	// Confirm D20 message to sender
			client.post('direct_messages/new', messageParams, function(err, message, response) {
				if (err) {
					console.log(err);
				} else {
					console.log("Message \'D20\' Sent!");
				}
			});
		} // Initiate Trade
	}
	} // read: function()
}