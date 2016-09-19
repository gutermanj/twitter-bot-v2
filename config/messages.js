var Twitter = require('twitter');
var mongodb = require('mongodb');
var async = require("async");
var schedule = require('node-schedule');
var wordfilter = require('wordfilter');
var TwitterLogin = require('node-twitter-api');
var pg = require('pg');
pg.defaults.ssl = true;
var connectionString = 'postgres://zqjwdkhttstwfx:ykFbgDKz8eTpXM3CCyim6Zyw-m@ec2-54-235-246-67.compute-1.amazonaws.com:5432/d43r3ued3buhe1';
var client = new pg.Client(connectionString);
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13';
var history = [];
var running = false;
var mongoPool = require('./mongo-pool.js');
var storage = require('node-persist');
storage.init();


// var twitterAuthClient = new TwitterLogin({
//     consumerKey: account.consumer_key,
//     consumerSecret: account.consumer_secret,
//     callback: 'http://localhost:3000/'
// });


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
						var filters = ["FAV", "FAVS", "RTS", "RT\'S", "RETWEETS", "RT", "RT!", "RTS,", "FAVS,", "RTS!", "RT,",
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
						var filters = ["D", "D20", "D15", "DONE", "D!", "D,", "D20,", "D20LMKWD", "D20LMK", "DN20", "DN", "DLMKWD", "DLML",
										"D15LMK", "F15", "F20", "D20,LMKWD"];
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

							if (account.active) {

								if (account.last_message === null) {

									var twitterAuthClient = new TwitterLogin({
									    consumerKey: account.consumer_key,
									    consumerSecret: account.consumer_secret,
									    callback: 'http://localhost:3000/'
									});

									twitterAuthClient.direct_messages('', {
										count: 1
									}, 	account.access_token,
										account.access_token_secret,
									function(err, messages, response) {


										if (err) {
											console.log("direct_messages: " + account.username, err);
											
											if (err.statusCode === 403) {

												var query = client.query('UPDATE manualaccounts SET status = $1 WHERE username = $2', [false, account.username]);

											}

										} else {
											var query = client.query("UPDATE manualaccounts SET last_message =" + "'" + messages[0].id_str + "'" + "WHERE username =" + "'" + account.username + "'");
												
											console.log("Set new Last Message ID for: " + account.username);

											// messages.forEach(function(message) {
											// 	var splitMessage = message.text.toUpperCase().split(" ");
											// 	var uppcasedMessage = message.text.toUpperCase();
											// 	// Convert received messages

											// 	if (d20(splitMessage)) {
											// 		var sender = message.sender.screen_name
											// 			// Call function to deal with D20
											// 		pullFromLmkwd(sender, account);
											// 	}

											// 	if (spacedFilter(uppcasedMessage)) {
											// 		var sender = message.sender.screen_name
											// 		pushSender(sender, account);
											// 	}

											// 	if (filter(uppcasedMessage)) {
											// 		var sender = message.sender.screen_name
											// 			// Call function to add sender to account que
											// 		pushSender(sender, account);
											// 	}


											// 	if (lmkwdFilter(splitMessage)) {
											// 		var sender = message.sender.screen_name

											// 		var localAccount = [];

											// 		var findLocal = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE list.account_id = $1 AND list.sender = $2', [account.id, sender]);

											// 		findLocal.on('row', function(row) {
											// 			localAccount.push(row);
											// 		});

											// 		findLocal.on('end', function() {
											// 			if (localAccount.length > 0) {
											// 				checkQued();
											// 			}
											// 		});

											// 		function checkQued() {
											// 			if (localAccount[0].qued === false) {
											// 				messageSirBryan(sender, localAccount[0]);
											// 			}
											// 		}
											// 		// Call function to handle incoming lmkwd messages
											// 	}
											// });

										}
									}); // Twitterclient.get
								} else {

									var twitterAuthClient = new TwitterLogin({
									    consumerKey: account.consumer_key,
									    consumerSecret: account.consumer_secret,
									    callback: 'http://localhost:3000/'
									});

									twitterAuthClient.direct_messages('', {
										since_id: account.last_message
									}, account.access_token,
									   account.access_token_secret,
									function(err, messages, response) {
										if (err) {
											console.log("direct_messages error: " + account.username + ": ", err);
											if (err.statusCode === 403) {

												var query = client.query('UPDATE manualaccounts SET status = $1 WHERE username = $2', [false, account.username]);

											}

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

							} // If account is active

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

											var twitterAuthClient = new TwitterLogin({
											    consumerKey: account.consumer_key,
											    consumerSecret: account.consumer_secret,
											    callback: 'http://localhost:3000/'
											});

											var params = {
												screen_name: foundAccount[0].sender
											};

											twitterAuthClient.users('show', params, 
												account.access_token, 
												account.access_token_secret,
												function(err, user, response) {
												if (err) {
													console.log("Users/Show", err);
												} else {
													if (user.followers_count > 75000) {
														accessGranted(foundAccount, account);
													} else {
														console.log("Not Enough Followers");
													}
												}
											});


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
															
															var addToQue = client.query('INSERT INTO que(sender, account_id, id) VALUES ($1, $2, DEFAULT)', [sender, account.id]);

														}

													var updateTwo = function updateAddQuedStatus() {

															var updateQued = client.query('UPDATE list SET qued = $1, history = $2 WHERE sender = $3 AND account_id = $4', [true, false, sender, account.id]);

														}
													async.series([
															function(callback) {
																async.parallel([updateOne, updateTwo]);
																console.log("New Senders Added To Que: " + sender + " added to " + account.username);
																callback();
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

									var addSenderQue = client.query('INSERT INTO que(sender, account_id, id) VALUES ($1, $2, DEFAULT)', [sender, account.id]);

								}

								async.series([
										function(callback) {
											async.parallel([updateOne, updateTwo]);
											callback();
										},
										function(callback) {
											console.log("Created List For " + sender + "on account: " + account.username);
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
					hour: 9,
					minute: 0
				}, function() {
					console.log("Sending Out Morning Rts!");
					morningMessage();
				});
				schedule.scheduleJob({
					hour: 9,
					minute: 16
				}, function() {
					console.log("Sending Out Morning Rts!");
					morningMessage();
				});
				schedule.scheduleJob({
					hour: 9,
					minute: 32
				}, function() {
					console.log("Sending Out Morning Rts!");
					morningMessage();
				});
				schedule.scheduleJob({
					hour: 17,
					minute: 05
				}, function() {
					console.log("Sending Out Afternoon Rts!");
					morningMessage();
				});

				schedule.scheduleJob({
					hour: 23,
					minute: 00
				}, function() {
					console.log("Total Trades Set To 0");
					resetTotalTrades();
				});

				// schedule.scheduleJob({
				// 	hour: 7,
				// 	minute: 0
				// }, function() {
				// 	console.log("Sending Out Morning Lmkwd!");
				// 	morningMessageLmkwd();
				// });

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

									var findAccount = client.query('SELECT * FROM que WHERE account_id = $1 ORDER BY id', [account.id]);

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

											if (time.getHours() < 6 || time.getHours() > 24) {
												console.log("Offline: Night Time");
											} else {

												if (account.active) {

													var openTweets = [];

													var pullOpenTweets = client.query('SELECT * FROM opentrades WHERE account_id = $1', [account.id]);

													pullOpenTweets.on('row', function(row) {

														openTweets.push(row);

													});

													pullOpenTweets.on('end', function() {

														openTweets.forEach(function(openTweet) {

															var twitterClient = new Twitter({

																consumer_key: account.consumer_key,
																consumer_secret: account.consumer_secret,
																access_token_key: account.access_token,
																access_token_secret: account.access_token_secret

															});

															twitterClient.post('statuses/destroy/' + openTweet.trade_id,
																function(err, tweet, response) {

																if (err) {
																	console.log("statuses/destroy: ", err);

																	console.log("Status Already Cleared.");
																	var removeOpenTrade = client.query('DELETE FROM opentrades WHERE account_id = $1 AND trade_id = $2', [openTweet.account_id, openTweet.trade_id]);

																} else {
																	console.log("Cleared Status.");
																	var removeOpenTrade = client.query('DELETE FROM opentrades WHERE account_id = $1 AND trade_id = $2', [openTweet.account_id, openTweet.trade_id]);
																}

															});

														});

														// After tweets are cleared, initiate the trade...
														initiateTrade(account, currentTrader);

													});

												}
											}

										}
									});

								});
						});
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
						});
					
				} // morning message function

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
							console.log('starting rts messages from: ' + account.username);

							var eachListed = [];

							var added = [];

							var getHistory = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE manualaccounts.id = $1 AND list.history = $2', [account.id, true]);

							getHistory.on('row', function(row) {
								if (eachListed.indexOf(row) < 0) {
									eachListed.push(row);
								}
							});

							getHistory.on('end', function() {

								eachListed.forEach(function(sender) {

									if (added.indexOf(sender.sender) < 0) {

										added.push(sender.sender);

										if (sender.qued) {
											console.log("Morning message not sent: Account Qued");
										} else if (sender.lmkwd) {
											console.log("Morning message not sent: Account on Lmkwd");
										} else if (sender.sent) {
											console.log("Morning message not sent: Account on Sent");
										} else {

											var messageParams = {
												screen_name: sender.sender,
												text: 'rts'
											};

											var twitterAuthClient = new TwitterLogin({
											    consumerKey: account.consumer_key,
											    consumerSecret: account.consumer_secret,
											    callback: 'http://localhost:3000/'
											});

											twitterAuthClient.direct_messages('new', messageParams, 
												account.access_token, 
												account.access_token_secret, 
												function(err, message, response) {

												if (err) return console.log(err);


												var query = client.query('UPDATE list SET history = $1, sent = $2 WHERE list.sender = $3 AND list.account_id = $4', [false, true, sender.sender, sender.account_id], function(err) {
													if (err) return console.log(err);

													console.log("Morning Message Sent To: " + sender.sender);

												});


											});

										}

									}

								});

							});

						}); // Accounts For Each
					}



				function afternoonMessage() {
					var accounts = [];
						// SQL Query > Last account created
						var query = client.query("SELECT * FROM manualAccounts");
						// Stream results back one row at a time
						query.on('row', function(row) {
							accounts.push(row);
						});
						// After all data is returned, close connection and return results
						query.on('end', function() {
							console.log("Accounts Ready.");
							checkTimeAfternoon(accounts);
						});
					
				} // morning message function

				function checkTimeAfternoon(accounts) {
						// At 7 AM, message the history lists with 'rts'
						accounts.forEach(function(account) {
							var twitterClient = new Twitter({
								consumer_key: account.consumer_key,
								consumer_secret: account.consumer_secret,
								access_token_key: account.access_token,
								access_token_secret: account.access_token_secret,
								timeout_ms: 60 * 1000
							});
							console.log('starting rts messages from: ' + account.username);

							var eachListed = [];

							var added = [];

							var getHistory = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE manualaccounts.id = $1 AND list.sent = $2', [account.id, true]);

							getHistory.on('row', function(row) {
								if (eachListed.indexOf(row) < 0) {
									eachListed.push(row);
								}
							});

							getHistory.on('end', function() {

								eachListed.forEach(function(sender) {

									if (added.indexOf(sender.sender) < 0) {

										added.push(sender.sender);

										if (sender.qued) {
											console.log("Morning message not sent: Account Qued");
										} else if (sender.lmkwd) {
											console.log("Morning message not sent: Account on Lmkwd");
										} else if (sender.history) {
											console.log("Morning message not sent: Account on History");
										} else {

											var twitterAuthClient = new TwitterLogin({
											    consumerKey: account.consumer_key,
											    consumerSecret: account.consumer_secret,
											    callback: 'http://localhost:3000/'
											});

											var messageParams = {
												screen_name: sender.sender,
												text: 'rts'
											};

											twitterAuthClient.direct_messages('new', messageParams,
												account.access_token,
												account.access_token_secret,
												function(err, message, response) {

												if (err) return console.log(err);

											});

										}

									}

								});

							});

						}); // Accounts For Each
					}





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
							checkTimePart2(accounts);
						});
					}); // pg connect
					function checkTimePart2(accounts) {
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

									if (added.indexOf(sender) < 0) {

										added.push(sender);

										if (sender.sent) {
											console.log("Morning message not sent: Account on Sent");
										} else {

											var twitterAuthClient = new TwitterLogin({
											    consumerKey: account.consumer_key,
											    consumerSecret: account.consumer_secret,
											    callback: 'http://localhost:3000/'
											});

											var messageParams = {
												screen_name: sender.sender,
												text: 'lmkwd'
											};

											twitterAuthClient.direct_messages('new', messageParams,
												account.access_token,
												account.access_token_secret,
												function(err, message, response) {

												if (err) return console.log(err);

												
														console.log("Morning LMKWD Message Sent To: " + sender.sender);


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

					var date = new Date();
		            var current_hour = date.getHours();
		            var current_minute = date.getMinutes();
		            var current_second = Math.abs(date.getSeconds());

		            var hmcombination = current_hour + ":" + current_minute + ":" + current_second;
		            console.log(hmcombination);

					var updateLastTrade = client.query('UPDATE last_trade SET hour = $1, minute = $2, second = $3', [current_hour, current_minute, current_second]);

					console.log("Iniated Trade for account: ", account.username);
					var twitterClient = new Twitter({
						consumer_key: account.consumer_key,
						consumer_secret: account.consumer_secret,
						access_token_key: account.access_token,
						access_token_secret: account.access_token_secret,
						timeout_ms: 60 * 1000
					});

					var twitterAuthClient = new TwitterLogin({
					    consumerKey: account.consumer_key,
					    consumerSecret: account.consumer_secret,
					    callback: 'http://localhost:3000/'
					});

					var params = {
						screen_name: currentTrader.sender,
						count: 3
					};
					twitterAuthClient.favorites('list', params, 
						account.access_token,
						account.access_token_secret,
						function(err, tweets, response) {


						// Pul storage here	

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
							var foo = 0;
							tweets.forEach(function(tweet) {
								foo++;
							});
							if (foo !== 3) {
								if (currentTrader.outbound === false) {

									var messageParams = {
										screen_name: 'sirbryanthewise',
										text: "Missing Favs - " + currentTrader.sender + " removed from que: " + account.username
									};
									// Confirm D20 message to sender
									twitterAuthClient.direct_messages('new', messageParams,
										account.access_token,
										account.access_token_secret,
										function(err, message, response) {

										if (err) {
											console.log(err);
										} else {
											console.log("Missing Favs - " + currentTrader.sender + " removed from que: " + account.username);
										}
									});

								}

								console.log("Not enough Favs");

								var changeStatus = client.query('UPDATE list SET outbound = $1, history = $2, qued = $5 WHERE sender = $3 AND account_id = $4', [false, true, currentTrader.sender, currentTrader.account_id, false], function(err) {
									if (err) return console.log(err);
								});

								var removeFromQue = client.query('DELETE FROM que WHERE sender = $1 AND account_id = $2', [currentTrader.sender, currentTrader.account_id], function(err) {
									if (err) return console.log(err);
								});
							} else {
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

									wordfilter.addWords(['BIT.LY', 'SEX', 'PORN', 'KIM K', 'KIM KARDASHIAN', 'MIA K', 'MIA KHALIFA',
															'VIRGIN', 'NUDE', 'HOOKUP', 'VAGINA', 'S3X', 'HORNY', 'NAKED', 'BLOWJOB',
															'LEAKED']);


									if (wordfilter.blacklisted(tweet.text)) {
										console.log('Tweet Contains Blacklisted Words');
									} else {

										var twitterClient = new Twitter({

											consumer_key: account.consumer_key,
											consumer_secret: account.consumer_secret,
											access_token_key: account.access_token,
											access_token_secret: account.access_token_secret

										});

										var params = {
											id: tweet.id_str
										}

										twitterAuthClient.statuses('retweet', params,
											account.access_token,
											account.access_token_secret,
											function(err, tweet, response) {

											if (err) {
												console.log("Statuses/retweet", err);

												if (err.statusCode === 403) {

													var query = client.query('UPDATE manualaccounts SET status = $1 WHERE username = $2', [false, account.username]);

												}
											} 

											console.log("Retweet Complete.");

											var greenStatus = client.query('UPDATE manualaccounts SET status = $1 WHERE username = $2', [true, account.username]);

											var addTrades = client.query('INSERT INTO opentrades (account_id, trade_id) VALUES ($1, $2)', [account.id, tweet.id_str]);


											// Start coutdown to undo the trade
											setTimeout(function() {
												twitterClient.post('statuses/destroy/' + tweet.id_str,
													function(err, tweet, response) {

													if (err) {
														console.log("statuses/destroy: ", err);

														if (err.statusCode === 403) {

															var query = client.query('UPDATE manualaccounts SET status = $1 WHERE username = $2', [false, account.username]);

														}

													} else {
														console.log("Unretweet Complete.");
													}
												});
											}, 1000 * 60 * 19.5); // Destroy retweet
											
										}); // retweet post
									}
								}); // tweets for each
							}
						}
					});

					function messageSender(currentTrader) {

						var twitterAuthClient = new TwitterLogin({
						    consumerKey: account.consumer_key,
						    consumerSecret: account.consumer_secret,
						    callback: 'http://localhost:3000/'
						});

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
						twitterAuthClient.direct_messages('new', messageParams, 
							account.access_token,
							account.access_token_secret,
							function(err, message, response) {

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

					var twitterAuthClient = new TwitterLogin({
					    consumerKey: account.consumer_key,
					    consumerSecret: account.consumer_secret,
					    callback: 'http://localhost:3000/'
					});

					var messageParams = {
						screen_name: x.username,
						text: "lmkwd"
					};
					// Confirm D20 message to sender
					twitterAuthClient.direct_messages('new', messageParams,
						account.access_token,
						account.access_token_secret,
						function(err, message, response) {

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
						
						// If the sender doesn't in the db
						// Lets create a list for them
						var updateOne = function createSenderList() {

							var addSenderToList = client.query('INSERT INTO list(sender, qued, lmkwd, history, sent, outbound, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', [sender, true, false, false, false, false, account.id]);

						}

						var updateTwo = function addSenderToQue() {

							var addSenderQue = client.query('INSERT INTO que(sender, account_id, id) VALUES ($1, $2, DEFAULT)', [sender, account.id]);

						}

						async.series([
								function(callback) {
									async.parallel([updateOne, updateTwo]);
									callback();
								},
								function(callback) {
									console.log("Created List For " + sender + ": Sent D20 To Us...");
								}
							],
							function(err, data) {
								console.log(err);
							}
						);

					}
				});

				function filterTheSender() {

					var updateOne = function updateAddQue() {
						if (foundAccount[0].qued === false) {

							var queryOne = client.query('UPDATE list SET qued = $1 WHERE sender = $2 AND account_id = $3', [true, sender, account.id], function(err) {
								if (err) return console.log(err);
							});

							var queryTwo = client.query('INSERT INTO que (sender, account_id, id) VALUES ($1, $2, DEFAULT)', [sender, account.id], function(err) {
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
								foundAccount[0].lmkwd === false &&
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
								}
							],
							function(error, data) {
								console.log(error);
							}
						);
					} else if (foundAccount[0].history &&
								foundAccount[0].outbound) {

						console.log("Finished Outbound Trade For: " + foundAccount[0].sender + " on account: " + account.username);

					};

				}
			}

			function incrementTotalTradeCount(account) {
					
				var incrementTrades = client.query('UPDATE manualaccounts SET total_trades = total_trades + 1 WHERE username = $1', [account.username]);

			}

			function resetTotalTrades(accounts) {
				var resetTrades = client.query('UPDATE manualaccounts SET total_trades = 0');
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
