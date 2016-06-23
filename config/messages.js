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
		// MAIN POOL FOR POSTGRES - Ends at bottom of module
		pg.connect(connectionString, function(err, client, done) {
			if (err) return console.log(err);

			var grantedAccounts = [];

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
						if (err) {
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
					function filter(uppcasedMessage) {
						var filters = ["FAV", "FAVS", "RTS", "RT\'S", "RETWEETS", "RT", "RTS,", "FAVS,", "RTS!", "RT,",
							"FAVORITES", "RTS?FAVS!", "TRADE", "RTS?", "RETWEETS?", "RETWEETS!", "RT?",
							"RETWEET", "RETWEET?", "RTS? FAVS, AD ON TOP NS 20", "RT TOP 3 LIKES! NS 15",
							"TRADE LIKES! NS 20", "RTS? 20NS", "RTS? 20 LMKWD", "RETWEETS? FAVS", "RT LIKES! NS 20",
							"RTS NS 15 LMK", "RETWEETS?"
						];

						for (i = 0; i < filters.length; i++) {
							if (uppcasedMessage.indexOf(filters[i]) > -1) {
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
							var twitterClient = new Twitter({
								consumer_key: account.consumer_key,
								consumer_secret: account.consumer_secret,
								access_token_key: account.access_token,
								access_token_secret: account.access_token_secret,
								timeout_ms: 60 * 1000
							});
							if (account.last_message === null) {
								twitterClient.get('direct_messages', {
									count: 30
								}, function(err, messages, response) {
									if (err) {
										console.log("direct_messages", err);
									} else {
										var query = client.query("UPDATE manualaccounts SET last_message =" + "'" + messages[0].id_str + "'" + "WHERE username =" + "'" + account.username + "'");
											
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

											if (filter(uppcasedMessage)) {
												var sender = message.sender.screen_name
													// Call function to add sender to account que
												pushSender(sender, account);
											}


											if (lmkwdFilter(splitMessage)) {
												var sender = message.sender.screen_name

												var localAccount = [];

												var findLocal = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE list.account_id = $1 AND list.sender = $2', [account.id, sender]);

												findLocal.on('row', function(row) {
													localAccount.push(row);
												});

												findLocal.on('end', function() {
													if (localAccount.length > 0) {
														checkQued();
													} else {
														console.log("Trying to mess it up, lel - received D20 from: " + sender + " for our account: " + account.username);
													}
												});

												function checkQued() {
													if (localAccount[0].qued === false) {
														messageSirBryan(sender, localAccount[0]);
													}
												}
												// Call function to handle incoming lmkwd messages
											}
										});
									}
								}); // client.get
							} else {
								twitterClient.get('direct_messages', {
									since_id: account.last_message
								}, function(err, messages, response) {
									if (err) {
										console.log("direct_messages", err);
									} else {
										if (messages.length < 1) {
											console.log("No New Messages");
										} else {
											console.log("Pulled New Messages...");
												var query = client.query("UPDATE manualaccounts SET last_message =" + "'" + messages[0].id_str + "'" + "WHERE username =" + "'" + account.username + "'");											messages.forEach(function(message) {
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

													var localAccount = [];

													var findLocal = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE list.account_id = $1 AND list.sender = $2', [account.id, sender]);

													findLocal.on('row', function(row) {
														localAccount.push(row);
													});

													findLocal.on('end', function() {
														if (localAccount.length > 0) {
															checkQued();
														} else {
															console.log("Trying to mess it up, lel - received lmkwd from: " + sender + " for our account: " + account.username);
														}
													});

													function checkQued() {
														if (localAccount[0].qued === false) {
															messageSirBryan(sender, localAccount[0]);
														}
													}
													// Call function to handle incoming lmkwd messages
												}
											});
										}
									}
								}); // client.get
							} //last message null else
						}); // forEach
					}

					function pushSender(sender, account) {

						// ----------------- NEW PROCESS FOR PUSH UNDER THIS --------------------------

						var findLocal = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE list.account_id = $1 AND list.sender = $2', [account.id, sender]);

						var foundAccount = [];

						findLocal.on('row', function(row) {
							foundAccount.push(row);
						});

						findLocal.on('end', function() {
							checkExistance();
						});

						function checkExistance() {
							if (foundAccount.length > 0) {

								if (foundAccount[0].qued) {
									console.log("Sender already qued");
								} else {

									if (blacklistFilter(sender)) {
										console.log("Sender On Blacklist");
									} else {

										if (grantedAccounts.indexOf(foundAccount[0].sender) < 0) {

											var twitterClient = new Twitter({
												consumer_key: account.consumer_key,
												consumer_secret: account.consumer_secret,
												access_token_key: account.access_token,
												access_token_secret: account.access_token_secret,
												timeout_ms: 60 * 1000
											});

											var params = {
												screen_name: foundAccount[0].sender
											};

											twitterClient.get('users/show', params, function(err, user, response) {
												if (err) {
													console.log("Users/Show", err)
												} else {
													if (user.followers_count > 75000) {
														grantedAccounts.push(foundAccount[0].sender);
														accessGranted(foundAccount, account);
													} else {
														console.log("Not Enough Followers");
													}
												}
											});

										} else {
											accessGranted(foundAccount, account);
										}

										// Function Is Called If Followers Exceed 75k
										function accessGranted(foundAccount, account) {

											if (foundAccount[0].lmkwd) {
												// var twitterClient = new Twitter ({
												//  			consumer_key: account.consumer_key,
												//  			consumer_secret: account.consumer_secret,
												//  			access_token_key: account.access_token,
												//  			access_token_secret: account.access_token_secret,
												//  			timeout_ms: 60 * 1000
												//  		});

												//  		var messageParams = { screen_name: sender, text: 'lmkwd' };
												//  		var items = [2, 3, 4, 5];
												// var randomMinute = items[Math.floor(Math.random()*items.length)];
												//   	// Confirm D20 message to sender
												//   	setTimeout(function() {
												// 	twitterClient.post('direct_messages/new', messageParams, function(err, message, response) {
												// 		if (err) {
												// 			console.log(err);
												// 		} else {
												// 			console.log("We let em know..." + sender + " Sent from: " + account.username);
												// 		}
												// 	});
												// }, 1000 * 60 * randomMinute);

												console.log("Would've sent lmkwd to " + sender + " from " + account.username);
											} else {
												if (foundAccount[0].outbound === false || foundAccount[0].sent === false) {
													var updateOne = function updateAddToQue() {
															
															var addToQue = client.query('INSERT INTO que(sender, account_id) VALUES ($1, $2)', [sender, account.id]);

														}

													var updateTwo = function updateAddQuedStatus() {

															var updateQued = client.query('UPDATE list SET qued = $1, history = $2 WHERE sender = $3 AND account_id = $4', [true, false, sender, account.id]);

														}
													async.series([
															function(callback) {
																async.parallel([updateOne, updateTwo]);
																callback();
															},
															function(callback) {
																console.log("New Senders Added To Que!");
															}
														],
														function(error, data) {
															console.log(error);
														}
													);
												}
											}

										} // Access Granted

									}

								}

							} else {

								// If the sender doesn't in the db
								// Lets create a list for them
								var updateOne = function createSenderList() {

									var addSenderToList = client.query('INSERT INTO list(sender, qued, lmkwd, history, sent, outbound, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', [sender, true, false, false, false, false, account.id]);

								}

								var updateTwo = function addSenderToQue() {

									var addSenderQue = client.query('INSERT INTO que(sender, account_id) VALUES ($1, $2)', [sender, account.id]);

								}

								async.series([
										function(callback) {
											async.parallel([updateOne, updateTwo]);
											callback();
										},
										function(callback) {
											console.log("Created List For " + sender);
										}
									],
									function(err, data) {
										console.log(err);
									}
								);

							}
						}


					} // pushSender
				}, 1000 * 65 * 1); // Message Pull set Interval
				console.log("currentQue Started!");
				schedule.scheduleJob({
					hour: 5,
					minute: 0
				}, function() {
					console.log("Sending Out Morning Rts!");
					morningMessage();
				});

				schedule.scheduleJob({
					hour: 7,
					minute: 0
				}, function() {
					console.log("Sending Out Morning Lmkwd!");
					morningMessageLmkwd();
				});

				// schedule.scheduleJob({
				// 	hour: 1,
				// 	minute: 0
				// }, function() {
				// 	console.log("Migrating Sent Back To History");
				// 	migrateSentToHistory();
				// });

				// Main Set Interval
				currentQue = setInterval(function() {
					var accounts = [];
					// Get a Postgres client from the connection pool
					// I have this here because Node said accounts was not defined... even though it was.
					pg.connect(connectionString, function(err, client, done) {
						// Handle connection errors
						if (err) {
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
							console.log("Prepared Traders");

								accounts.forEach(function(account) {

									var foundAccount = [];

									var findAccount = client.query('SELECT * FROM que WHERE account_id = $1', [account.id]);

									findAccount.on('row', function(row) {
										foundAccount.push(row);
									});

									findAccount.on('end', function() {
										console.log("Done Pulling Que - Ready To Trade")
										var currentTrader = foundAccount[0];

										if (foundAccount.length < 1) {
											console.log("No Accounts Currently In Que For: " + account.username);
										} else {

											var time = new Date();

											if (time.getHours() < 7 || time.getHours() > 24) {
												console.log("Offline: Night Time");
											} else {
												initiateTrade(account, currentTrader);
											}

										}
									});

								});

							done();
						});
					}); // pg connect
					// End postgres query
					// called when pg query is done

				}, 1000 * 60 * 20);

				function migrateSentToHistory() {
					var accounts = [];
					pg.connect(connectionString, function(err, client, done) {
						// Handle connection errors
						if (err) {
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
									collection.find({
										_id: account.username
									}).toArray(function(err, result) {
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
															collection.update({
																	_id: account.username
																}, {
																	$push: {
																		history: thisSent
																	}
																}) // Migrate each Sent Account to History List

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
						if (err) {
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
							var twitterClient = new Twitter({
								consumer_key: account.consumer_key,
								consumer_secret: account.consumer_secret,
								access_token_key: account.access_token,
								access_token_secret: account.access_token_secret,
								timeout_ms: 60 * 1000
							});

							var eachListed = [];

							var added = [];

							var getHistory = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE manualaccounts.id = $1 AND list.sent = $2', [account.id, true]);

							getHistory.on('row', function(row) {
								eachListed.push(row);
							});

							getHistory.on('end', function() {

								eachListed.forEach(function(sender) {

									added.push(sender);

									if (added.indexOf(sender) < 0) {

										if (sender.qued) {
											console.log("Morning message not sent: Account Qued");
										} else if (sender.lmkwd) {
											console.log("Morning message not sent: Account on Lmkwd");
										} else {

											var messageParams = {
												screen_name: sender.sender,
												text: 'rts'
											};

											twitterClient.post('direct_messages/new', messageParams, function(err, message, response) {
												if (err) return console.log(err);

												var updateOne = function updateHistoryStatus() {

													var query = client.query('UPDATE list SET history = $1, sent = $2 WHERE list.sender = $3 AND list.account_id = $4', [false, true, sender.sender, sender.account_id], function(err) {
														if (err) return console.log(err);

														console.log("Morning Message Sent To: " + sender.sender);

													});

												}

											});

										}

									}

								});

							});

						}); // Accounts For Each
					}
				} // morning message function

				function morningMessageLmkwd() {
					var accounts = [];
					pg.connect(connectionString, function(err, client, done) {
						// Handle connection errors
						if (err) {
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
							var twitterClient = new Twitter({
								consumer_key: account.consumer_key,
								consumer_secret: account.consumer_secret,
								access_token_key: account.access_token,
								access_token_secret: account.access_token_secret,
								timeout_ms: 60 * 1000
							});

							var eachListed = [];

							var added = [];

							var getLmkwd = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE manualaccounts.id = $1 AND list.lmkwd = $2', [account.id, true]);

							getHistory.on('row', function(row) {
								eachListed.push(row);
							});

							getHistory.on('end', function() {

								eachListed.forEach(function(sender) {

									added.push(sender);

									if (added.indexOf(sender) < 0) {

										if (sender.sent) {
											console.log("Morning message not sent: Account on Sent");
										} else {

											var messageParams = {
												screen_name: sender.sender,
												text: 'lmkwd'
											};

											twitterClient.post('direct_messages/new', messageParams, function(err, message, response) {
												if (err) return console.log(err);

												var updateOne = function updateHistoryStatus() {

													var query = client.query('UPDATE list SET history = $1, sent = $2 WHERE list.sender = $3 AND list.account_id = $4', [false, true, sender.sender, sender.account_id], function(err) {
														if (err) return console.log(err);

														console.log("Morning Message Sent To: " + sender.sender);


													});

												}

											});

										}

									}

								});

							});




						}); // Accounts For Each
					}
				} // morning message function


				// Start the actual trade with each account
				function initiateTrade(account, currentTrader) {
					console.log("Iniated Trade for account: ", account.username);
					var twitterClient = new Twitter({
						consumer_key: account.consumer_key,
						consumer_secret: account.consumer_secret,
						access_token_key: account.access_token,
						access_token_secret: account.access_token_secret,
						timeout_ms: 60 * 1000
					});
					var params = {
						screen_name: currentTrader.sender,
						count: 3
					};
					twitterClient.get('favorites/list', params, function(err, tweets, response) {
						if (err) {
							console.log("Favorites/list: ", err);
							// If getting Traders favorites results in a 404

							var queryOne = client.query('UPDATE list SET qued = $1 WHERE sender = $2 AND account_id = $3', [false, currentTrader.sender, currentTrader.account_id], function(err) {
								if (err) return console.log(err);
							});

							var queryTwo = client.query('DELETE FROM que WHERE sender = $1 AND account_id = $2', [currentTrader.sender, currentTrader.account_id], function(err) {
								if (err) return console.log(err);
							});

							console.log("Account does not exist via Twitter - Removed from Que...");

						} else {
							var foo = [];
							tweets.forEach(function(tweet) {
								foo.push(tweet);
							});
							if (foo.length !== 3) {
								var messageParams = {
									screen_name: 'sirbryanthewise',
									text: "Missing Retweets for account: " + currentTrader.sender
								};
								// Confirm D20 message to sender
								twitterClient.post('direct_messages/new', messageParams, function(err, message, response) {
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

									var foundAccount = [];

									var checkOutbound = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE list.account_id = $1 AND list.sender = $2', [currentTrader.account_id, currentTrader.sender]);

									checkOutbound.on('row', function(row) {
										foundAccount.push(row);
									});

									checkOutbound.on('end', function() {

										if (foundAccount[0].outbound === false) {

											addToLmkwdList(currentTrader, account);

										} else {

											console.log(currentTrader.sender + " on outbound list for " + account.username);

											var changeStatus = client.query('UPDATE list SET outbound = $1, history = $2, qued = $5 WHERE sender = $3 AND account_id = $4', [false, true, currentTrader.sender, currentTrader.account_id, false], function(err) {
												if (err) return console.log(err);
											});

											var removeFromQue = client.query('DELETE FROM que WHERE sender = $1 AND account_id = $2', [currentTrader.sender, currentTrader.account_id], function(err) {
												if (err) return console.log(err);
											});

										}

									});

									

									// lmkwdInterval(currentTrader, client, account);
									incrementTotalTradeCount(account);
								}
								twitterClient.post('statuses/retweet/' + tweet.id_str, function(err, tweet, response) {
									if (err) {
										console.log("Statuses/retweet", err);
									} 

									console.log("Retweet Complete.");

									// Start coutdown to undo the trade
									setTimeout(function() {
										twitterClient.post('statuses/destroy/' + tweet.id_str, function(err, tweet, response) {
											if (err) {
												console.log("statuses/destroy: ", err);
											} else {
												console.log("Unretweet Complete.");
											}
										});
									}, 1000 * 60 * 19.7); // Destroy retweet
								}); // retweet post
							}); // tweets for each
						}
					});

					function messageSender(currentTrader) {
						if (currentTrader.sent) {
							var messageParams = {
								screen_name: currentTrader.sender,
								text: 'D20'
							};
						} else {
							var messageParams = {
								screen_name: currentTrader.sender,
								text: 'D20'
							};
						}
						// Confirm D20 message to sender
						twitterClient.post('direct_messages/new', messageParams, function(err, message, response) {
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

				var addToLmk = client.query('UPDATE list SET lmkwd = $1 WHERE sender = $2 AND account_id = $3', [true, currentTrader.sender, currentTrader.account_id], function(err) {
					if (err) return console.log(err);
				});

				var updateQuedList = client.query('UPDATE list SET qued = $1 WHERE sender = $2 AND account_id = $3', [false, currentTrader.sender, currentTrader.account_id], function(err) {
					if (err) return console.log(err);
				});

				var removeFromQue = client.query('DELETE FROM que WHERE sender = $1 AND account_id = $2', [currentTrader.sender, currentTrader.account_id], function(err) {
					if (err) return console.log(err);
				});

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
				var client = new Twitter({
					consumer_key: account.consumer_key,
					consumer_secret: account.consumer_secret,
					access_token_key: account.access_token,
					access_token_secret: account.access_token_secret,
					timeout_ms: 60 * 1000
				});

				presentLmkwd.forEach(function(x) {
					var messageParams = {
						screen_name: x.username,
						text: "lmkwd"
					};
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

				var foundAccount = [];

				var checkStatus = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE list.sender = $1 AND list.account_id = $2', [sender, account.id]);

				checkStatus.on('row', function(row) {
					foundAccount.push(row);
				});

				checkStatus.on('end', function() {
					if (foundAccount.length > 0) {
						filterTheSender();
					} else {
						console.log("Trying to mess it up, lel - received D20 from: " + sender + " for our account: " + account.username);
					}
				});

				function filterTheSender() {

					var updateOne = function updateAddQue() {
						if (foundAccount[0].qued === false) {

							var queryOne = client.query('UPDATE list SET qued = $1 WHERE sender = $2 AND account_id = $3', [true, sender, account.id], function(err) {
								if (err) return console.log(err);
							});

							var queryTwo = client.query('INSERT INTO que (sender, account_id) VALUES ($1, $2)', [sender, account.id], function(err) {
								if (err) return console.log(err);
							});
						}
					}

					var updateTwo = function updateRemoveSent() {
						client.query('UPDATE list SET sent = $1 WHERE sender = $2 AND account_id = $3', [false, sender, account.id]);
					}

					var updateThree = function updateRemoveLmkwd() {
						client.query('UPDATE list SET lmkwd = $1 WHERE sender = $2 AND account_id = $3', [false, sender, account.id]);
					}

					var updateFour = function updateAddHistory() {
						client.query('UPDATE list SET history = $1 WHERE sender = $2 AND account_id = $3', [true, sender, account.id]);
					}

					var updateFive = function updateAddOutbound() {
						client.query('UPDATE list SET outbound = $1 WHERE sender = $2 AND account_id = $3', [true, sender, account.id]);
					}
						// If sender is on nothing
					if (foundAccount[0].qued === false &&
						foundAccount[0].lmkwd === false &&
						foundAccount[0].history === false &&
						foundAccount[0].sent === false &&
						foundAccount[0].outbound === false) {

						async.series([
								function(callback) {
									async.parallel([updateOne, updateFive]);
									callback();
								},
								function(callback) {
									console.log("Hmm that's weird: " + sender + " Sent D20 and is not on our lists." + " Added to - " + account.username);
								}
							],
							function(error, data) {
								console.log(error);
							}
						);
						// If sender is on sent
					} else if (foundAccount[0].sent &&
								foundAccount[0].qued === false &&
								foundAccount[0].lmkwd === false) {
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
								console.log(error);
							}
						);
						console.log(sender + " on send list for " + account.username);
						// If sender is on lmkwd
					} else if (foundAccount[0].lmkwd) {
						// REMOVE FROM LMKWD => ADD TO HISTORY
						async.series([
								function(callback) {
									async.parallel([updateThree, updateFour]);
									callback();
								},
								function(callback) {
									console.log("Received D20, LMK- => H+ " + sender + " was added to " + account.username);
								}
							],
							function(error, data) {
								console.log(error);
							}
						);
					}

				}
			}

			function incrementTotalTradeCount(account) {
					
				var incrementTrades = client.query('UPDATE manualaccounts SET total_trades = total_trades + 1 WHERE username = $1', [account.username]);

			}

			function resetTotalTrades(accounts) {
				MongoClient.connect(url, function(err, db) {
					if (err) {
						console.log("Unable to connect to Mongo. Error: ", err);
					} else {
						var collection = db.collection('accounts');
						accounts.forEach(function(account) {
							collection.update({
								_id: account.username
							}, {
								$set: {
									'total_trades': 0
								}
							})
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
						collection.find().toArray(function(err, result) {
							if (err) {
								console.log(err);
							} else {
								for (var i = 0; i < result.length; i++) {
									if (result[i]._id === sender) {
										return true;
									}
								}
							} // else
						}); // Grab current trader from que


					}
				}); // MongoClient
			} // blacklistFilter


			function messageSirBryan(sender, account) {
				// NEW STUFF HERE AND BELOW

				pg.connect(connectionString, function(err, client, done) {
					if (err) {
						return console.error('error fetching client from pool', err);
					}

					client.query('INSERT INTO lmkwd (sender, timestamp, account_id) VALUES ($1, DEFAULT, $2)', [sender, account.id], function(err, result) {
						if (err) {
							return console.error('error inserting user into lmkwd', err);
						}

						done();
						console.log("Successfully added sender to lmkwd");

					});

				});

			}
		}); // Postgres Pool!

		} // read: function()
}


// NOTES --------------------------

// db.accounts.update( { _id: 'DiyNaiis' }, { $push: { lmkwd: { 'username': [ '1243787273424' ] } } });