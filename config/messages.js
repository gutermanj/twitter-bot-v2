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
		    var filters = ["FAV", "FAVS", "RTS", "RT\'S", "RETWEETS", "RT", "RTS,", "FAVS,", "RTS!", "RT,",
		    					"FAVORITES", "RTS?FAVS!", "TRADE", "RTS?", "RETWEETS?", "RETWEETS!", "RT?",
		    					"RETWEET", "RETWEET?"];

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

		function d20(splitMessage) {
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

		    					if (d20(splitMessage)) {
							    	var sender = message.sender.screen_name
							    	// Call function to deal with D20
							    	pullFromLmkwd(sender, account);
							    }

							    if (filter(splitMessage)) {
							    	var sender = message.sender.screen_name
							    	// Call function to add sender to account que
							    	pushSender(sender, account);
							    }


							    if (lmkwdFilter(splitMessage)) {
							    	var sender = message.sender.screen_name
							    	// Call function to message Bryan ( Missing Retweets )
							    	messageSirBryan(sender, account);
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

								    if (d20(splitMessage)) {
								    	var sender = message.sender.screen_name
								    	// Call function to deal with D20
								    	pullFromLmkwd(sender, account);
								    }

								    if (filter(splitMessage)) {
								    	var sender = message.sender.screen_name
								    	// Call function to add sender to account que
								    	pushSender(sender, account);
								    }


								    if (lmkwdFilter(splitMessage)) {
								    	var sender = message.sender.screen_name
								    	// Call function to message Bryan ( Missing Retweets )
								    	messageSirBryan(sender, account);

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
											if (result[0].lmkwd.indexOf(sender) > -1) {
												var client = new Twitter ({
									    			consumer_key: account.consumer_key,
									    			consumer_secret: account.consumer_secret,
									    			access_token_key: account.access_token,
									    			access_token_secret: account.access_token_secret,
									    			timeout_ms: 60 * 1000
									    		});

									    		var messageParams = { screen_name: sender, text: 'lmkwd' };

									    		var items = [2, 3, 4, 5];

												var randomMinute = items[Math.floor(Math.random()*items.length)];

										    	// Confirm D20 message to sender
										    	setTimeout(function() {
													client.post('direct_messages/new', messageParams, function(err, message, response) {
														if (err) {
															console.log(err);
														} else {
															console.log("We let em know..." + sender + " Sent from: " + account.username);
														}
													});
												}, 1000 * 60 * randomMinute);
											} else {
												collection.update(
													{ _id:  account.username },
													{ $push: { children: sender } }
												) // Add sender to que

												// REMOVE SENDER FROM HISTORY
												// SO WHEN WE RECEIVE DONE FROM THEIR D20, IT DOESN'T RE-ADD THEM TO QUE

												// -----------------------------------------------------------------------

												// PUSH THIS NEW CODE WHEN YOU HAVE A CHANCE

												collection.update(
													{ _id: account.username },
													{ $pull: { history: sender } }
												)
												console.log("New Senders Added To Que!");
											}
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

														// Attempt to send morning message
														morningMessage(time);

														if (time.getHours() < 10 && time.getHours() >= 20) {
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

			function morningMessage(time) {

				var accounts = [];

				pg.connect(connectionString, function(err, client, done) {
			        // Handle connection errors
			        if(err) {
			          done();
			          console.log(err);
			        }
			        // SQL Query > Last account created
			        var query = client.query("SELECT * FROM manualAccounts");
			        // Stream results back one row at a time
			        query.on('row', function(row) {
			            accounts.push(row);
			        });
			        // After all data is returned, close connection and return results
			        query.on('end', function() {
			        	console.log("Accounts Ready.");
			        	checkTime(accounts);
			            done();
			        });
			    }); // pg connect

				function checkTime(accounts) {
				if (time.getHours() === 7) {
					// At 7 AM, message the history lists with 'rts'

					accounts.forEach(function(account) {
						var client = new Twitter({
							consumer_key: account.consumer_key,
			    			consumer_secret: account.consumer_secret,
			    			access_token_key: account.access_token,
			    			access_token_secret: account.access_token_secret,
			    			timeout_ms: 60 * 1000
						});

						MongoClient.connect('mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13', function(err, db) {
							if (err) {
								console.log("Unable to connect to Mongo. Error: ", err);
							} else {
								console.log("Preparing Morning Message.");
								var collection = db.collection('accounts');
									collection.find( { _id: account.username } ).toArray(function(err, result) {
										if (err) {
											console.log(err);
										} else {	
											var historyList = result[0].history;

											historyList.forEach(function(sender, index) {
												if (result[0].children.indexOf(sender) > -1) {
													console.log("Morning message not sent, account qued");
												} else {
														if (result[0].lmkwd.indexOf(sender) > -1) {
															console.log("User On lmkwd")
														} else {
															var messageParams = { screen_name: sender, text: 'rts' };
													    	// Confirm D20 message to sender
															client.post('direct_messages/new', messageParams, function(err, message, response) {
																if (err) {
																	console.log(err);
																} else {
																	console.log('rts sent to: ', sender);
																	collection.update(
																		{ _id: account.username },
																		{ $pull: { history: sender } }
																	)
																	collection.update(
																		{ _id: account.username },
																		{ $push: { sent: sender } }
																	)
																}
															});
														}
														
												}
											});
										} // 2nd else
									});
							} // else
						}); // MongoClient
					}); // Accounts For Each
				} // time check
				}
			} // morning message function
			


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
										// lmkwdInterval(currentTrader, client, account);
										incrementTotalTradeCount(account);
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
							{ $push: { lmkwd: currentTrader } }
						) // Remove current trader from que upon completion
						console.log("Account Added To lmkwd List");
					}
			}); // MongoClient
		}

		// Every 6 hours, if accounts are in this lsit, message them 'lmkwd'
		lmkInterval = setInterval(function() {
			MongoClient.connect(url, function(err, db) {
					if (err) {
						console.log("Unable to connect to Mongo. Error: ", err);
					} else {
						var collection = db.collection('accounts');
						
						collection.find({}).toArray(function(err, result) {
							// For each of our accounts
							result.forEach(function(ourAccount) {
								// Push each lmkwd user into array
								var presentLmkwd = [];

								ourAccount.lmkwd.forEach(function(x) {
									presentLmkwd.push(x);
								});

								// If any accounts are in lmkwd list, message them
								// A different function handles removing them in time
								if (presentLmkwd.length > 0) {
									var pgAccount = [];

									pg.connect(connectionString, function(err, client, done) {
								        // Handle connection errors
								        if(err) {
								          done();
								          console.log(err);
								          return res.status(500).json({ success: false, data: err});
								        }
								        // SQL Query > Last account created
								        var query = client.query("SELECT * FROM manualAccounts WHERE username=" + "'" + ourAccount._id + "'");
								        // Stream results back one row at a time
								        query.on('row', function(row) {
								            pgAccount.push(row);
								        });
								        // After all data is returned, close connection and return results
								        query.on('end', function() {
								        	messageThem(pgAccount, presentLmkwd);
								            done();
								        });
								    }); // pg connect

								}

							});
						});
					}
			}); // MongoClient
		}, 1000 * 60 * 60 * 6);


		function messageThem(pgAccount, presentLmkwd) {
			var account = pgAccount[0];
			var client = new Twitter ({
	    			consumer_key: account.consumer_key,
	    			consumer_secret: account.consumer_secret,
	    			access_token_key: account.access_token,
	    			access_token_secret: account.access_token_secret,
	    			timeout_ms: 60 * 1000
	    		});

			presentLmkwd.forEach(function(x) {
				var messageParams = { screen_name: x.username, text: "lmkwd" };
		    	// Confirm D20 message to sender
				client.post('direct_messages/new', messageParams, function(err, message, response) {
					if (err) {
						console.log(err);
					} else {
						console.log("lmkwd sent to" + x.username);
					}
				});
			});
		}

		function pullFromLmkwd(sender, account) {
			MongoClient.connect(url, function(err, db) {
				if (err) {
					console.log("Unable to connect to Mongo. Error: ", err);
				} else {
					var collection = db.collection('accounts');
						collection.find( { _id: account.username } ).toArray(function(err, result) {
							if (err) {
								console.log(err);
							} else {
								// If sender is on nothing
								if (result[0].children.indexOf(sender) < 0 &&
								 	result[0].lmkwd.indexOf(sender) < 0 &&
								  	result[0].history.indexOf(sender) < 0 &&
								  	result[0].sent.indexOf(sender) < 0) {

									console.log("Hmm thats weird: " + sender + " Sent D20 and is not on our lists.");

								// If sender is on sent
								} else if (	result[0].sent.indexOf(sender) > -1 &&
											result[0].children.indexOf(sender) < 0 &&
								  			result[0].lmkwd.indexOf(sender) < 0) {

									collection.update(
										{ _id: account.username },
										{ $push: { children: sender } }
									)

									collection.update(
										{ _id: account.username },
										{ $pull: { sent: sender } }
									)

									collection.update(
										{ _id: account.username },
										{ $pull: { lmkwd: sender } }
									)

									console.log("Received D20 from " + sender + ": removed from history | added to que - " + result[0]._id);

									// If sender is on lmkwd
								}  else if (result[0].lmkwd.indexOf(sender) > -1) {
									if (result[0].history.indexOf(sender) < 0) {
										collection.update(
											{ _id: account.username },
											{ $push: { history: sender } }
										)
									}

									collection.update(
										{ _id: account.username },
										{ $pull: { lmkwd: sender } }
									)

									console.log("Received D20 from " + sender + ": removed from lmkwd | added to history - " + result[0]._id);

								
								}

								db.close();
								}
						});
				} // else
			}); // MongoClient
		}

		function incrementTotalTradeCount(account) {
			MongoClient.connect(url, function(err, db) {
				if (err) {
					console.log("Unable to connect to Mongo. Error: ", err)
				} else {
					var collection = db.collection('accounts');
						collection.update(
							{
								_id: account.username
							},
							
							{
								$inc: {
										total_trades: 1
									  }
							}
						)
				}
			});
		}

		function resetTotalTrades(accounts) {
			MongoClient.connect(url, function(err, db) {
				if (err) {
					console.log("Unable to connect to Mongo. Error: ", err);
				} else {
					var collection = db.collection('accounts');
						accounts.forEach(function(account) {
							collection.update(
								{ _id: account.username },
								{
									$set: {
										'total_trades' : 0
									}
								}
							)
						});
						db.close();
				}
			});
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
								}
							} // else
						}); // Grab current trader from que
				}
			}); // MongoClient
		} // blacklistFilter


		function messageSirBryan(sender, account) {
			var client = new Twitter ({
				consumer_key: account.consumer_key,
    			consumer_secret: account.consumer_secret,
    			access_token_key: account.access_token,
    			access_token_secret: account.access_token_secret,
    			timeout_ms: 60 * 1000
			});

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

