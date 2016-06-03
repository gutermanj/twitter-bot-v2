var Twitter = require('twitter');
var mongodb = require('mongodb');
var async = require("async");
var schedule = require('node-schedule');
var pg = require('pg');
pg.defaults.ssl = true;
var connectionString = 'postgres://zqjwdkhttstwfx:ykFbgDKz8eTpXM3CCyim6Zyw-m@ec2-54-235-246-67.compute-1.amazonaws.com:5432/d43r3ued3buhe1';
var client = new pg.Client(connectionString);
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13';
var history = [];
var running = false;
var mongoPool = require('./mongo-pool.js');

new mongoPool.start();
// Sets global db object from custom mongo module

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

		function spacedFilter(uppcasedMessage) {
			var filters = ["TOP LIKES LMK!"];
			for (i = 0; i < filters.length; i++) {
				if (uppcasedMessage.indexOf(filters[i]) > -1) {
					return true;
				}
			}
		}

		function d20(splitMessage) {
			var filters = ["D", "D20", "D15", "DONE", "D!", "D,", "D20,"];
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
		    					var uppcasedMessage = message.text.toUpperCase();
		    					// Convert received messages

		    					if (d20(splitMessage)) {
							    	var sender = message.sender.screen_name
							    	// Call function to deal with D20
							    	pullFromLmkwd(sender, account);
							    }

							    if (spacedFilter(uppcasedMessage)) {
							    	var sender = message.sender.screen_name
									pushSender(sender, account);
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
			    					var uppcasedMessage = message.text.toUpperCase();
			    					// Convert received messages

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

								    if (spacedFilter(uppcasedMessage)) {
							    		var sender = message.sender.screen_name
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
								console.log("Mongo Error: Grabbing Account To Add Que -", err);
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
												var updateOne = function updateAddQue() {
													collection.update(
														{ _id:  account.username },
														{ $push: { children: sender } }
													) // Add sender to que
												}
												// REMOVE SENDER FROM HISTORY
												// SO WHEN WE RECEIVE DONE FROM THEIR D20, IT DOESN'T RE-ADD THEM TO QUE
												var updateTwo = function updateRemoveHistory() {
													collection.update(
														{ _id: account.username },
														{ $pull: { history: sender } }
													)
												}
												async.series([
														function(callback) {
															async.parallel([updateOne, updateTwo]);
															callback();
														},
														function(callback) {
															console.log("New Senders Added To Que!");
															db.close();
														}
													],
													function(error, data) {
														console.log(error);
														db.close();
													}
												);
											}
										}
									}
								}
						});
				} // else
			}); // MongoClient

		} // pushSender
	}, 1000 * 65 * 1); // Message Pull set Interval
		console.log("currentQue Started!");
		schedule.scheduleJob({hour:5, minute: 0}, function() {
			console.log("Sending Out Morning Rts!");
			morningMessage();	
		});

		schedule.scheduleJob({hour:7, minute: 0}, function() {
			console.log("Sending Out Morning Lmkwd!");
			morningMessageLmkwd();	
		});

		schedule.scheduleJob({hour:1, minute: 0}, function() {
			console.log("Migrating Sent Back To History");
			migrateSentToHistory();	
		});

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

												if (time.getHours() < 10 || time.getHours() > 24) {
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
		function migrateSentToHistory() {
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
		        	done();
		        	console.log("Accounts Ready To Be Migrated.");
		        	migrate(accounts);
		        });
		    }); // pg connect
			function migrate() {
				accounts.forEach(function(account) {
					MongoClient.connect('mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13', function(err, db) {
						if (err) {
							console.log(err);
						} else {
							var collection = db.collection('accounts');
							collection.find( { _id: account.username } ).toArray(function(err, result) {
								if (err) {
									console.log(err);
								} else {
									var currentSent = result[0].sent;
									var updateOne = function updateMigrateToHistory() {
														var alreadyAdded = [];
														currentSent.forEach(function(thisSent) {
															if (result[0].history.indexOf(thisSent) < 0) {
																if (alreadyAdded.indexOf(thisSent) > -1) {
																	console.log("Duplicate Sent");
																} else {
																	collection.update(
																		{ _id:  account.username },
																		{ $push: { history: thisSent } }
																	) // Migrate each Sent Account to History List

																	alreadyAdded.push(thisSent);
																}
															}
														}); // current sent for each
													}

									async.series([
											function(callback) {
												async.parallel([updateOne]);
												console.log(".");
												callback();
											},
											function(callback) {
												console.log("Finished Migrating Sent List For Account: " + account.username);
											}
										],
										function(error, data) {
											console.log(error);
											db.close();
										}
									); // series
								}
							});
						}
					});
				});
			}
		}
		function morningMessage() {
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
		        	done();
		        	console.log("Accounts Ready.");
		        	checkTime(accounts);
		        });
		    }); // pg connect
			function checkTime(accounts) {
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
											} else if (result[0].lmkwd.indexOf(sender) > -1) {
												console.log("Morning message not sent, account on lmkwd");
											} else {
												var messageParams = { screen_name: sender, text: 'rts' };
												client.post('direct_messages/new', messageParams, function(err, message, response) {
													if (err) {
														console.log(err);
													} else {
														var updateOne = function updateRemoveHistory() {
															collection.update(
																{ _id:  account.username },
																{ $pull: { history: sender } }
															) // Pull Sender From History
														}

														var updateTwo = function updateAddSent() {
															collection.update(
																{ _id:  account.username },
																{ $push: { sent: sender } }
															) // Add Sender To Sent
														}

														async.series([
																function(callback) {
																	async.parallel([updateOne, updateTwo]);
																	callback();
																},
																function(callback) {
																	console.log("Morning Message Sent To: ", sender);
																	db.close();
																}
															],
															function(error, data) {
																console.log(error);
																db.close();
															}
														);
												

													}
												});
											}
										});
									} // 2nd else
								});
						} // else
					}); // MongoClient
				}); // Accounts For Each
			}
		} // morning message function

		function morningMessageLmkwd() {
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
		        	done();
		        	console.log("Accounts Ready.");
		        	checkTime(accounts);
		        });
		    }); // pg connect
			function checkTime(accounts) {
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
										var lmkwdList = result[0].lmkwd;
										lmkwdList.forEach(function(sender, index) {
											if (result[0].sent.indexOf(sender) > -1) {
												console.log("Morning message not sent, account on lmkwd");
											} else {
												var messageParams = { screen_name: sender, text: 'lmkwd' };
												client.post('direct_messages/new', messageParams, function(err, message, response) {
													if (err) {
														console.log(err);
													} else {
														console.log("Morning Message LMKWD Sent To " + sender);
													}
												});
											}
										});
									} // 2nd else
								});
						} // else
					}); // MongoClient
				}); // Accounts For Each
			}
		} // morning message function

		
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

										var collection = db.collection('accounts');
										collection.find(
											{ _id: account.username }
										).toArray(function(err, result) {
											if (result[0].outbound.indexOf(currentTrader) < 0) {
												addToLmkwdList(currentTrader, account);
											} else {
												console.log(currentTrader + "on outbound list for " + account.username);

												collection.update(
													{ _id: account.username },
													{ $pull: { outbound: currentTrader } }
												)
											}
										});

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
														db.close();
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
					db.close();
			}); // MongoClient
		}

		// // Every 6 hours, if accounts are in this lsit, message them 'lmkwd'
		// setInterval(function() {
		// 	MongoClient.connect(url, function(err, db) {
		// 			if (err) {
		// 				console.log("Unable to connect to Mongo. Error: ", err);
		// 			} else {
		// 				var collection = db.collection('accounts');
		// 				collection.find().toArray(function(err, result) {
		// 					// For each of our accounts
		// 					var accounts = result[0];

		// 					accounts.forEach(function(ourAccount) {
		// 						// Push each lmkwd user into array
		// 						var presentLmkwd = [];

		// 						ourAccount.lmkwd.forEach(function(x) {
		// 							presentLmkwd.push(x);
		// 						});

		// 						// If any accounts are in lmkwd list, message them
		// 						// A different function handles removing them in time
		// 						if (presentLmkwd.length > 0) {
		// 							var pgAccount = [];

		// 							pg.connect(connectionString, function(err, client, done) {
		// 						        // Handle connection errors
		// 						        if(err) {
		// 						          done();
		// 						          console.log(err);
		// 						        }
		// 						        // SQL Query > Last account created
		// 						        var query = client.query("SELECT * FROM manualAccounts WHERE username=" + "'" + ourAccount._id + "'");
		// 						        // Stream results back one row at a time
		// 						        query.on('row', function(row) {
		// 						            pgAccount.push(row);
		// 						        });
		// 						        // After all data is returned, close connection and return results
		// 						        query.on('end', function() {
		// 						        	done();
		// 						        	messageThem(pgAccount, presentLmkwd);
		// 						        });
		// 						    }); // pg connect

		// 						}

		// 					});
		// 				});
		// 			}
		// 			db.close();
		// 	}); // MongoClient
		// }, 1000 * 60 * 60 * 6);


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
								db.close();
							} else {
								var updateOne = function updateAddQue() {
												if (result[0].children.indexOf(sender) < 0) {
														collection.update(
															{ _id: account.username },
															{ $push: { children: sender } }
														)
													}
												}

								var updateTwo = function updateRemoveSent() {
													collection.update(
														{ _id: account.username },
														{ $pull: { sent: sender } }
													)
												}

								var updateThree = function updateRemoveLmkwd() {
													collection.update(
														{ _id: account.username },
														{ $pull: { lmkwd: sender } }
													)
												  }

								var updateFour = function updateAddHistory() {
													if (result[0].history.indexOf(sender) < 0) {
														collection.update(
															{ _id: account.username },
															{ $push: { history: sender } }
														)
													}
												}

								var updateFive = function updateAddOutbound() {
													collection.update(
														{ _id: account.username },
														{ $push: { outbound: sender } }
													)
								}
								// If sender is on nothing
								if (result[0].children.indexOf(sender) < 0 &&
								 	result[0].lmkwd.indexOf(sender) < 0 &&
								  	result[0].history.indexOf(sender) < 0 &&
								  	result[0].sent.indexOf(sender) < 0) {

									async.series([
											function(callback) {
												async.parallel([updateOne]);
												callback();
											},
											function(callback) {
												console.log("Hmm that's weird: " + sender + " Sent D20 and is not on our lists." + " Added to - " + account.username);
												db.close();
											}
										],
										function(error, data) {
											console.log(error);
											console.log("Hmm that's weird: " + sender + " Sent D20 and is not on our lists." + " Added to - " + account.username);
											db.close();
										}
									);
									// COMMENTED OUT FOR 1 TIME TURN ON
									// COMMENTED OUT FOR 1 TIME TURN ON
									// COMMENTED OUT FOR 1 TIME TURN ON
									console.log(sender + " not on any lists for " + account.username);

								// If sender is on sent
								} else if (	result[0].sent.indexOf(sender) > -1 &&
											result[0].children.indexOf(sender) < 0 &&
								  			result[0].lmkwd.indexOf(sender) < 0) {
								// ADD TO QUE => REMOVE FROM SENT => REMOVE FROM LMKWD => ADD TO OUTBOUND
									async.series([
											function(callback) {
												async.parallel([updateTwo, updateOne, updateThree, updateFive]);
												callback();
											},
											function(callback) {
											console.log("Received D20, Q+ => S- => LMK-");
											}
										],
										function(error, data) {
											console.log("MONGO ERROR: ON SENT" + error);
											db.close();
										}
									);
									console.log(sender + " on send list for " + account.username);
									// If sender is on lmkwd
								}  else if (result[0].lmkwd.indexOf(sender) > -1) {
									// REMOVE FROM LMKWD => ADD TO HISTORY
									async.series([
											function(callback) {
												async.parallel([updateThree, updateFour]);
												callback();
											},
											function(callback) {
											console.log("Received D20, LMK- => H+");
											db.close();											
											}
										],
										function(error, data) {
											console.log(error);
											console.log("Received D20, LMK- => H+");
											db.close();
										}
									);
								}
							}

						});
				} // else
				
			}); // MongoClient
		}

		function incrementTotalTradeCount(account) {
			MongoClient.connect(url, function(err, db) {
				if (err) {
					console.log("Unable to connect to Mongo. Error: ", err);
					db.close();
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
				db.close();
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
						
				}
				db.close();
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
				db.close();
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

