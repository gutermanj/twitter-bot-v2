var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');
var assert = require('assert');
var Twit = require('twit');
var Twitter = require('twitter');
var TwitterLogin = require('node-twitter-api');
var flash = require('connect-flash');
var storage = require('node-persist');
var manual = require('./config/manual.js'); // Include manual config file 
var messages = require('./config/messages.js');
var mongodb = require("mongodb");

storage.initSync();

// Database configuration
var pg = require('pg');

pg.defaults.ssl = true;

var connectionString = 'postgres://zqjwdkhttstwfx:ykFbgDKz8eTpXM3CCyim6Zyw-m@ec2-54-235-246-67.compute-1.amazonaws.com:5432/d43r3ued3buhe1';



 // || 'postgres://localhost:5432/twitterbot'

// var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/twitterbot';

// var connectionString = process.env.DATABASE_URL || 'postgres://postgres:potato@localhost:5432/twitterbot';


var client = new pg.Client(connectionString);

var MongoClient = mongodb.MongoClient;

var url = 'mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13';

// Creating tables
// ----------------------------------------
//  var query = client.query('CREATE TABLE accounts(id SERIAL PRIMARY KEY, username VARCHAR(150) not null, email VARCHAR(150) not null, password VARCHAR(150) not null, consumer_key VARCHAR(150) not null, consumer_secret VARCHAR(150) not null, access_token VARCHAR(150) not null, access_token_secret VARCHAR(150) not null, price VARCHAR(150) not null, timestamp VARCHAR(150), complete BOOLEAN)');
//  query.on('end', function() { client.end(); });

// var query = client.query('CREATE TABLE users(id SERIAL PRIMARY KEY, username VARCHAR(150) not null, email VARCHAR(150) not null, password VARCHAR(150) not null, complete BOOLEAN)');
// query.on('end', function() { client.end(); });

// Connect to the database
client.connect(function(err, db) {
  if (err) {
    console.log('Something went wrong while connecting to the db');
  } else {
    console.log('Connected to db, sweeeet!');
  }
});


var session = require('express-session');
var FirebaseStore = require('connect-firebase')(session);


var users = require('./routes/users');


// Twitter configuration
// This will be set as a variable per request...
// So I don't really need this, but I'm gonna keep it for reference

var T = new Twitter({
  consumer_key:         'k07kZVV7oPWspXMotr9pIVEUP',
  consumer_secret:      '45adhHKs2fPdrmJiLWUrspvtGuFt73DGik72gRTWepVJEAged5',
  access_token_key:     '2784707616-Uf44QV2ILKHyxx1XAqqpPXBHr8WVWCdrehNseKu',
  access_token_secret:  '5j3jsFu1dicB2KzGfSRHePa3CDIJorwXYer1Sp6SXvVyC',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
});

// Session configuration
var firebaseStoreOptions = {
    // Your FireBase database
    // Go to the host in your browser to see sessions
    host: 'twitterbot.firebaseio.com/',
    // Secret token you can create for your Firebase database
    token: '4cRYm1o1AXmlLDGG1rl6wZKNYVpoyyk9g9W3Du1G',
    // How often expired sessions should be cleaned up
    reapInterval: 600000,
};



var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(express(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', users);


// Session Middleware
app.use(session({
    store: new FirebaseStore(firebaseStoreOptions),
    secret: 'rteiibj03jrn2ojnsdong020i4j3fnwlksdfn', // Change this to anything else
    resave: false,
    saveUninitialized: true
}));


// app.use(function(req, res, next) {
//   if (req.session && req.session.user) {
//     User.findOne({ username: req.session.username }, function(err, user) {
//       if (user) {
//         req.user = user;
//         delete req.user.password;
//         req.session.user = req.user;
//         res.locals.user = req.user;
//       }
//       next();
//     });
//   } else {
//     next();
//   }
// });

// Require someone to be logged in
function requireLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/signin');
  } else {
    next();
  }
}



// Filter Admin vs. User
function requireAdmin(req, res, next) {
  if (!req.session.user.admin) {
    res.redirect('/me');
  } else {
    next();
  }
}






// Flash Messages
app.use(flash());
app.use(function(req, res, next){
    res.locals.success = req.flash('success');
    res.locals.errors = req.flash('error');
    next();
});


// Current Time, can be used for Timestamps

  var date = new Date();
  var current_hour = date.getHours();
  if (current_hour > 12) {
      var hours = current_hour - 12;
      var dateOrNight = "PM"
  } else {
      var dateOrNight = "AM"
      var hours = current_hour
  }

  if (date.getMinutes() === 0) {
      var minutes = "00";
  } else if (date.getMinutes() < 10) {
      var minutes = "0" + date.getMinutes();
  } else {
      var minutes = date.getMinutes();
  }

  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var current_day = days[date.getDay()];
  var current_date = date.getDate();
  var current_month = months[date.getMonth()];
  var year = date.getYear() - 100
  var timestamp = current_day + " " + hours + ":" + minutes + " " + dateOrNight + ", " + current_month + " " + current_date + " " + "20" + year;

// END TIMESTAMP



messages.read(true);
// ******** REMOVED FOR DEVELOPMENT OF ADMIN DASH **********





// --------------- Mostly Routes ---------------------

// Signup route, I'm probably gonna remove this when I deploy
app.get('/signup', function(req, res, next) {
  res.render('signup');
});
// REMOVED FOR PRODUCTION




app.post('/signup', function(req, res, next) {
  
   // Turning that password into something funky
    var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));



    var results = [];

    // Grab data from http request
    var data = {
      username: req.body.username,
      email: req.body.email,
      password: hash,
      consumer_key: req.body.consumer_key,
      consumer_secret: req.body.consumer_secret,
      access_token: req.body.access_token,
      access_token_secret: req.body.access_token_secret,
      complete: false,
      timestamp: timestamp,
      admin: false
    };

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Create new row for an account
        client.query("INSERT INTO accounts(username, email, password, consumer_key, consumer_secret, access_token, access_token_secret, price, timestamp, complete, admin) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", [data.username, data.email, data.password, data.consumer_key, data.consumer_secret, data.access_token, data.access_token_secret, data.price, data.timestamp, data.complete, data.admin]);


        // SQL Query > Last account created
        var query = client.query("SELECT * FROM accounts ORDER BY id DESC LIMIT 1");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            req.session.user = data;
            res.redirect('/me');
        });


    }); // pg connect

  });


// app.get('/admin/signup', function(req, res) {
//   res.render('admin-signup');
// });

// app.post('/admin/signup', function(req, res, next) {
  
//    // Turning that password into something funky
//     var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));



//     var results = [];

//     // Grab data from http request
//     var data = {
//       username: req.body.username,
//       email: req.body.email,
//       password: hash,
//       complete: false,
//       admin: true
//     };

//     if (req.body.password === req.body.password_confirmation) {

//       // Get a Postgres client from the connection pool
//       pg.connect(connectionString, function(err, client, done) {
//           // Handle connection errors
//           if(err) {
//             done();
//             console.log(err);
//             return res.status(500).json({ success: false, data: err});
//           }

//           // SQL Query > Create new row for an account
//           client.query("INSERT INTO users(username, email, password, complete, admin) values($1, $2, $3, $4, $5)", [data.username, data.email, data.password, data.complete, data.admin]);


//           // SQL Query > Last account created
//           var query = client.query("SELECT * FROM accounts ORDER BY id DESC LIMIT 1");

//           // Stream results back one row at a time
//           query.on('row', function(row) {
//               results.push(row);
//           });

//           // After all data is returned, close connection and return results
//           query.on('end', function() {
//               done();
//               req.session.user = data;
//               res.redirect('/dashboard');
//           });


//       }); // pg connect
//     } else {
//       res.redirect('/admin/signup');
//     }

//   });



app.post('/newaccount/manual', requireAdmin, function(req, res) {

  // Turning that password into something funky
  var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));

  var data = {
      username: req.body.username,
      email: req.body.email,
      password: hash,
      consumer_key: req.body.consumer_key,
      consumer_secret: req.body.consumer_secret,
      access_token: req.body.access_token,
      access_token_secret: req.body.access_token_secret,
      timestamp: timestamp,
      admin: false
    };

  // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Create new row for an account
        var query = client.query("INSERT INTO manualaccounts(username, email, password, consumer_key, consumer_secret, access_token, access_token_secret, timestamp, admin, last_message, active, status) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)", [data.username, data.email, data.password, data.consumer_key, data.consumer_secret, data.access_token, data.access_token_secret, data.timestamp, data.admin, null, true, true]);

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            res.redirect('/dashboard');
        });


    }); // pg connect


    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } else {
        //HURRAY!! We are connected. :)
        console.log('Connection established to', url);

        // Get the documents collection
        var collection = db.collection('accounts');

        //Create que for new account
        var account = { _id: req.body.username, children: [], history: [], lmkwd: [], sent: [], outbound: [], total_trades: 0 };

        // Insert some users
        collection.insert([account], function (err, result) {
          if (err) {
            console.log(err);
          } else {
            console.log('Created que for: ', account._id);
          }
          //Close connection
          db.close();
        });
      }
    });

});


// Signin route
app.get('/signin', function(req, res) {
  if(!req.session.user) {
    res.render('signin.jade');
  } else if (req.session.user.admin) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/me')
  }
});


// Signin route
app.post('/signin', function(req, res) {

    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Grab user input
        var usernameInput = req.body.username;
        var passwordInput = req.body.password;

        // See if the email exists
        var query = client.query('SELECT * FROM accounts WHERE username =' + '\'' + usernameInput + '\'');

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done(); // If the email doesn't exist - get out of here
            if (results === null) {
              res.redirect('/signin');
            } else { // If it does exist
              if (results[0] !== undefined) {
              var user = results[0];
              // Check bcrypted password to see if they match
              if (bcrypt.compareSync(req.body.password, user.password)) {
                req.session.user = user; // Set the session
                res.locals.user = user;
                res.redirect('/me');
              } else {
                // If they don't match
                res.redirect('/signin');
              }
            } else {
              res.redirect('/signin');
            } // For some reason I have to check if it's undefined as well as 
              // null or SQL will yell at us
          }
        }); // query on end
      }); //pg connect
  });


app.get('/admin/signin', function(req, res) {
  
  if (req.session.user) {
    res.redirect('/');
  }   else {
    res.render('admin-signin.jade');
  }

});

app.post('/admin/signin', function(req, res) {

    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Grab user input
        var usernameInput = req.body.username;
        var passwordInput = req.body.password;

        // See if the email exists
        var query = client.query('SELECT * FROM users WHERE username =' + '\'' + usernameInput + '\'');

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done(); // If the email doesn't exist - get out of here
            if (results === null) {
              res.redirect('/signin');
            } else { // If it does exist
              if (results[0] !== undefined) {
              var user = results[0];
              // Check bcrypted password to see if they match
              if (bcrypt.compareSync(req.body.password, user.password)) {
                req.session.user = user; // Set the session
                res.locals.user = user;
                res.redirect('/');
              } else {
                // If they don't match
                res.redirect('/signin');
              }
            } else {
              res.redirect('/signin');
            } // For some reason I have to check if it's undefined as well as 
              // null or SQL will yell at us
          }
        }); // query on end
      }); //pg connect
  });


// Logout route
app.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});


app.get('/me', requireLogin, function(req, res) {
  res.locals.user = req.session.user;
  res.render('user-index');
});




// Dashboard route
app.get('/', requireLogin, requireAdmin, function(req, res, next) {

    

    var lastTrade = [];

    var getLastTrade = client.query('SELECT * FROM last_trade');

    getLastTrade.on('row', function(row) {
      lastTrade.push(row);
    });

    getLastTrade.on('end', function() {

      var lastTradeClean = lastTrade[0].hour + " : " + lastTrade[0].minute;

      res.locals.lastTrade = lastTradeClean;


    });

    // Get some info for the charts
    var userCount = [];
    var accountCount = [];
    var manualAccountCount = [];
    var DisabledAccountCount = [];
    var allLmkwdNotifications = []

    

    // Get a Postgres client from the connection pool
    // pg.connect(connectionString, function(err, client, done) {
    //     // Handle connection errors
    //     if(err) {
    //       done();
    //       console.log(err);
    //       return res.status(500).json({ success: false, data: err});
    //     }

        // SQL Query > Last account created
        var users = client.query("SELECT COUNT(*) FROM users");

        // Stream results back one row at a time
        users.on('row', function(row) {
            userCount.push(row);
        });

        // After all data is returned, close connection and return results
        users.on('end', function() {
            res.locals.userCount = userCount[0];
            lmkwdQuery();
        });

        function lmkwdQuery() {
           var lmkwdNotifications = client.query("SELECT * FROM manualaccounts JOIN lmkwd ON (manualaccounts.id = lmkwd.account_id)");

          lmkwdNotifications.on('row', function(row) {
            allLmkwdNotifications.push(row);
          });

          lmkwdNotifications.on('end', function() {
            accountsQuery();
          });

        }


        function accountsQuery() {
           // haha, account count
          var accounts = client.query("SELECT COUNT(*) FROM accounts");

          // Stream results back one row at a time
          accounts.on('row', function(row) {
            accountCount.push(row);
          });

          // After all data is returned, close connection and return results
          accounts.on('end', function() {
              res.locals.running = running;
              res.locals.manualRunning = manualRunning;
              res.locals.accountCount = accountCount[0];
              manualAccountsQuery();
              // splitAccounts(res);

              
          });
        }

        function manualAccountsQuery() {
           var manualAccounts = client.query("SELECT COUNT(*) FROM manualaccounts WHERE status = 'true'");
           var disabledAccounts = client.query("SELECT COUNT(*) FROM manualaccounts WHERE status = 'false'");

          manualAccounts.on('row', function(row) {
            manualAccountCount.push(row);
          });

          disabledAccounts.on('row', function(row) {
            DisabledAccountCount.push(row);
          });

          disabledAccounts.on('end', function(row) {
            res.locals.DisabledAccountCount = DisabledAccountCount[0];
          });

          manualAccounts.on('end', function() {
            res.locals.ActiveAccountCount = manualAccountCount[0];
            eachManualAccountQuery();
          });
        }

    


    function eachManualAccountQuery() {

      var allManualAccounts = [];

      var total_trade_count = 0;

      var getAccounts = client.query('SELECT * FROM manualaccounts ORDER BY username ASC');

      getAccounts.on('row', function(row) {
          allManualAccounts.push(row);
      });

      getAccounts.on('end', function() {
          res.locals.manAccounts = allManualAccounts;

          allManualAccounts.forEach(function(account) {

            total_trade_count = total_trade_count + account.total_trades;

          });

          res.locals.totalTrades = total_trade_count;
          res.render('admin');

      });


    }

    // });
    

  res.locals.user = req.session.user;
  

});




// Charts route
app.get('/charts', requireLogin, requireAdmin, function(req, res) {
  res.locals.user = req.session.user;
  res.render('charts', { title: 'Twitter Bot | Charts' });
});


// Forms route
app.get('/forms', requireLogin, requireAdmin, function(req, res) {
  res.locals.user = req.session.user;
  res.render('forms', { title: 'Twitter Bot | Forms' });
});


// New account created by admin
app.post('/newaccount', requireLogin, requireAdmin, function(req, res) {

    // TIME STAMP
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var current_day = days[date.getDay()];
    var current_date = date.getDate();
    var current_month = months[date.getMonth()];
    var year = date.getYear() - 100
    var timestamp = current_day + " " + hours + ":" + minutes + " " + dateOrNight + ", " + current_month + " " + current_date + " " + "20" + year;

    // Turning that password into something funky
    var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));



    var results = [];

    // Grab data from http request
    var data = {
      username: req.body.username,
      email: req.body.email,
      password: hash,
      consumer_key: req.body.consumer_key,
      consumer_secret: req.body.consumer_secret,
      access_token: req.body.access_token,
      access_token_secret: req.body.access_token_secret,
      price: req.body.price,
      timestamp: timestamp,
      complete: false,
      admin: false
    };

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Create new row for an account
        client.query("INSERT INTO accounts(username, email, password, consumer_key, consumer_secret, access_token, access_token_secret, price, timestamp, complete, admin) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", [data.username, data.email, data.password, data.consumer_key, data.consumer_secret, data.access_token, data.access_token_secret, data.price, data.timestamp, data.complete, data.admin]);


        // SQL Query > Last account created
        var query = client.query("SELECT * FROM accounts ORDER BY id DESC LIMIT 1");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            res.redirect('/dashboard');
        });


    }); // pg connect

    req.flash('success', 'Account was created!'); 
});





// New Tweet POST routes

app.post('/tweet', requireLogin, requireAdmin, function(req, res) {
  var status = req.body.tweet
  newTweet(status);
  res.redirect('/forms');
});



// New Tweet Hard Coded

function newTweet(status) {
  var status = status;
  T.post('statuses/update', { status: status }, function(err, data, response) {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }
  });
}

function getTweets() {
  T.get('search/tweets', { q: '@julianguterman since:2015-01-01', count: 1 }, function(err, data, response) {
    console.log(data)
  });

}










// ================================================ START APPLICATION | ONLINE | ======================================================



var stable = true;

var onlineStatus = false;

var running = false;

  setInterval(function() {
    if (onlineStatus === false && running === false) {
      // Offline...
    } else {
      if (running === false) {

           setInterval(function() {

              if (onlineStatus && running) {
                console.log(".");
              } else if (onlineStatus) {
                  
                  console.log("...");
                  resetInterval();

                  running = true;
              }

            }, 1000);
          }

      }

  }, 1000);








var oddSplit = [];

var evenSplit = [];

var arrayFull = false;



  // THE MAGIC

  function resetInterval() {

    var max_length = oddSplit.length;

    var index = 0;

    var pairs = [];

    var slicedPairs = [];

    var checkEven = [];

    var checkOdd = [];

    var pairingCounter = 0;

    var finishedPairing = false;

    var attemptCounter = 0;


    console.log("CURRENT ARRAYS: ");

    console.log(oddSplit);

    console.log(evenSplit);


    timer = setInterval(function() {

      if (finishedPairing) {
        // Idling
      } else {
        // Use oddSplit and evenSplit as the original arrays
        oddSplit.forEach(function(element, index, array) {
          var randIndex = Math.floor(Math.random() * max_length);
          var oddAccount = element;
          var evenAccount = evenSplit[randIndex];

          var currentPair = "" + index + " " + randIndex + "";

            if (pairs.indexOf(currentPair) > -1 || pairs === []) {
              // console.log("Pair Already Exists...");
              // console.log(pairs);
            } else {
              if (checkEven.indexOf(randIndex) > -1 || checkOdd.indexOf(index) > -1) {
                // console.log("One Account Has Already Been Paired...");
                attemptCounter++;
              } else {
                if (oddAccount.type !== evenAccount.type) {
                  // console.log("Account Type Not Equal!");
                  attemptCounter++;
                } else {
                  checkOdd.push(index);
                  checkEven.push(randIndex);
                  pairs.push(currentPair);
                  // console.log(pairs.indexOf(currentPair));
                  // console.log("Pair Found!");
                  pairingCounter++;
                }
              }

              
              if (pairingCounter >= oddSplit.length || attemptCounter > oddSplit.length * 20) {
                console.log("Retweeting Started...");
                console.log(pairs);
                finishedPairing = true;

                // Start 20 Minute Retweet Timer

                toggleTimer(pairs);

              } else {
                finishedPairing = false;
              }

            }

        

        





        }); // forEach loop

      }

      }, 100); // setInterval

    } // resetInterval



var manualRunning = false;

var manualStarted = false;

app.get('/api/v1/manual', requireAdmin, function(req, res) {
  
  if (manualRunning) {

    clearInterval(manualInterval);
    manualRunning = false;
    manualStarted = false;
    console.log(manualStarted);
    console.log("False");
    messages.read(manualRunning);
    return res.json("Manual Proccess Stopped!");
    res.redirect('/dashboard');


  } else {

    startManualMarket();
    console.log("True")
    return res.json("Manual Proccess Started!");


    res.redirect('/dashboard');

  }


}); // app.get manual

function startManualMarket() {
  console.log("startManualMarket called.");
  manualRunning = true;
  start();
}

 
  function start() {
    manualInterval = setInterval(function() {

    if (manualRunning && manualStarted === false) {
      manualStarted = true;
      console.log("Starting!");
      messages.read(manualRunning); // ./config/messages

    } else if (manualRunning && manualStarted) {
      console.log("Already Running");
    } else {
      console.log("Offline...");
    }
      

    }, 20000);
  }


app.post('/api/v1/remove-lmkwd-notifications', function(req, res) {

    var father = req.body.father;
    var child = req.body.child;

    var foundLmkwd = [];

    // pg.connect(connectionString, function(err, client, done) {
    //     // Handle connection errors
    //     if(err) {
    //       done();
    //       console.log(err);
    //     }
        // SQL Query > Last account created
        var query = client.query('SELECT * FROM lmkwd INNER JOIN manualaccounts ON (lmkwd.account_id = manualaccounts.id) WHERE manualaccounts.username = $1 AND lmkwd.sender = $2', [father, child]);
        // Stream results back one row at a time
        query.on('row', function(row) {
            foundLmkwd.push(row);
        });
        // After all data is returned, close connection and return results
        query.on('end', function() {
            removeFoundLmkwd();

        });

        function removeFoundLmkwd() {

          var removeFromLmkwd = client.query('DELETE FROM lmkwd WHERE sender = $1 AND account_id = $2', [foundLmkwd[0].sender, foundLmkwd[0].account_id]);

          removeFromLmkwd.on('end', function() {
            console.log("Done removing from LMKWD notifications");
          });

        }
    // }); // pg connect

});


app.post('/api/v1/add-que', function(req, res) {

    // pg.connect(connectionString, function(err, client, done) {

      console.log(req.body.username);

      var foundOne = [];

      var checkExistence = client.query('SELECT * FROM list WHERE list.sender = $1 AND list.account_id = $2', [req.body.sender, req.body.username]);

      checkExistence.on('row', function(row) {
        foundOne.push(row);
      });

      checkExistence.on('end', function() {

        if (foundOne.length > 0) {
          updateList();
        } else {
          createNewList();
          console.log(foundOne);
        }
      });

      function updateList() {

          var addToQue = client.query('UPDATE list SET qued = $1, outbound = $2 WHERE sender = $3 AND account_id = $4', [true, true, req.body.sender, req.body.username], function(err) {
            if (err) return console.log(err);

          });

      }

      function createNewList() {

          var addToQue = client.query('INSERT INTO list(sender, qued, lmkwd, history, sent, outbound, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', [req.body.sender, true, false, false, false, true, req.body.username], function(err) {
            if (err) return console.log(err);

          });

      }


      var removeFromActualQue = client.query('INSERT INTO que (sender, account_id) VALUES ($1, $2)', [req.body.sender, req.body.username], function(err) {
          if (err) return console.log(err);

          res.json(req.body.username + " Added To Que");
      });

    // }); pg

});

app.post('/api/v1/add-lmkwd', function(req, res) {

        var foundAccount = [];

        var findList = client.query('SELECT * FROM list WHERE sender = $1 AND account_id = $2', [req.body.sender, req.body.username]);

        findList.on('row', function(row) {

          foundAccount.push(row);

        });

        findList.on('end', function() {

          if (foundAccount.length > 0) {

              var updateLmkwd = client.query('UPDATE list SET lmkwd = $1 WHERE sender = $2 AND account_id = $3', [true, req.body.sender, req.body.username], function(err) {

                if (err) return console.log(err);

                return res.json(req.body.sender + " Added To Lmkwd: Already Exists");
                done();

              });

          } else {

              var updateLmkwd = client.query('INSERT INTO list(sender, qued, lmkwd, history, sent, outbound, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', [req.body.sender, false, true, false, false, false, req.body.username], function(err) {

                if (err) return console.log(err);

                return res.json(req.body.sender + " Added To Lmkwd: Created List");
                done();

              });

          }

          

        });

});

app.post('/api/v1/add-history', function(req, res) {

    // pg.connect(connectionString, function(err, client, done) {

        var updateLmkwd = client.query('UPDATE list SET history = $1 WHERE sender = $2 AND account_id = $3', [true, req.body.sender, req.body.username], function(err) {

            if (err) return console.log(err);

            return res.json(req.body.sender + " Added To History");
            done();

        });

    // }); pg

});

app.post('/api/v1/show-que', function(req, res) {

  // pg.connect(connectionString, function(err, client, done) {

      var showQue = client.query('SELECT * FROM manualaccounts JOIN list ON (manualaccounts.id = list.account_id) WHERE manualaccounts.username = $1', [req.body.username]);

      var que = [];

      showQue.on('row', function(row) {
          que.push(row);
      });

      showQue.on('end', function() {
        return res.json(que);
        done();
      });

  // }); pg

});

app.post('/api/v1/get-account-info', function(req, res) {

  var getInfo = client.query('SELECT * FROM manualaccounts WHERE username = $1', [req.body.username]);

  var account = [];

  getInfo.on('row', function(row) {

    account.push(row);

  }); 

  getInfo.on('end', function() {

    return res.json(account);

  });

});

app.post('/api/v1/show-lmkwd', function(req, res) {

  MongoClient.connect(url, function(err, db) {
    if (err) {
      console.log(err);
    } else {
      var collection = db.collection('accounts');
        collection.findOne( { _id: req.body.username }, function(err, result) {
          if (err) {
            console.log(err);
          } else {
            return res.json(result);
            db.close();
          }
        });
        
    }
  });

});

app.post('/api/v1/remove-from-que', function(req, res) {

  // pg.connect(connectionString, function(err, client, done) {

    console.log(req.body.dad_id);

    var removeFromQue = client.query('UPDATE list SET qued = $1, outbound = $2 WHERE sender = $3 AND account_id = $4', [false, false, req.body.username, req.body.dad_id], function(err) {
      if (err) return console.log(err);

    });

    var removeFromActualQue = client.query('DELETE FROM que WHERE sender = $1 AND account_id = $2', [req.body.username, req.body.dad_id], function(err) {
        if (err) return console.log(err);

        res.json(req.body.username + " Removed From Que");
    });

  // }); pg

});

app.post('/api/v1/remove-from-sent', function(req, res) {

    // pg.connect(connectionString, function(err, client, done) {

        console.log(req.body.dad_id);

        var removeFromQue = client.query('UPDATE list SET sent = $1 WHERE sender = $2 AND account_id = $3', [false, req.body.username, req.body.dad_id], function(err) {
          if (err) return console.log(err);

          res.json(req.body.username + " Removed From Sent");
        });

    // }); pg

});

app.post('/api/v1/remove-from-lmkwd', function(req, res) {

    // pg.connect(connectionString, function(err, client, done) {

        console.log(req.body.dad_id);

        var removeFromQue = client.query('UPDATE list SET lmkwd = $1 WHERE sender = $2 AND account_id = $3', [false, req.body.username, req.body.dad_id], function(err) {
          if (err) return console.log(err);

          res.json(req.body.username + " Removed From Lmkwd");
        });

    // }); pg

});

app.post('/api/v1/remove-from-rts', function(req, res) {

    // pg.connect(connectionString, function(err, client, done) {

        console.log(req.body.dad_id);

        var removeFromQue = client.query('UPDATE list SET history = $1 WHERE sender = $2 AND account_id = $3', [false, req.body.username, req.body.dad_id], function(err) {
          if (err) return console.log(err);

          res.json(req.body.username + " Removed From History");
        });

    // }); pg

});

app.post('/api/v1/blacklist', function(req, res) {

  MongoClient.connect(url, function(err, db) {
    if (err) {
      console.log(err);
    } else {
      var collection = db.collection('blacklist');
        collection.insert(
            { _id: req.body.sender }
          )

        console.log("New Account Added To Blacklist", req.body.sender);
      db.close();
      return res.json("OK");
    }
  });

});




app.get('/api/v1/toggle', requireAdmin, function(req, res) {


    if (running) {

      onlineStatus = false;
      running = false;

      arrayFull = true;

      console.log("Shutting down......");
      clearInterval(timer);
      clearInterval(executeTimer);

      res.redirect('/dashboard');

    } else {

    var all = [];

    pg.connect(connectionString, function(err, client, done) {

      if(err) {
        done();
        console.log(err);
        return res.status(500).json({ success: false, data: err });
      }

      var allAccounts = client.query("SELECT * FROM accounts");

      allAccounts.on('row', function(row) {
        all.push(row);
      });

      allAccounts.on('end', function() {
        startMarket(all, res);
        done();
        return res.json(all);
        
      });




    }); // pg.connect

  }

});




function startMarket(all, res) {


var oddCounter = 0;

var evenCounter = 0;

all.forEach(function(element, index, array) {


  if (arrayFull) {
    pairAccounts();
  } else {
    if (element.id % 2 === 0) {
      evenSplit.push(element);
        if (element.id === array.length) {
          pairAccounts();
        }
    } else {
      oddSplit.push(element);
        if (element.id === array.length) {
          pairAccounts();
        }
    } // Sort odd accounts

  }

});


} // startMarket




function pairAccounts() {

  console.log("Splitting Compelte!");

  onlineStatus = true;

}





// =============================== IF STATUS IS RUNNING EVERY 20 MINUTES THIS EXECUTES =======================================






function toggleTimer(pairs) {

  console.log("Timer Started: ");

  var accountPairs = [];

  console.log(pairs);

  pairs.forEach(function(pair) {

    var splitPair = pair.split(" ");

    accountPairs.push(splitPair);

  });

  executeTimer =  setInterval(function() {

                    accountPairs.forEach(function(pair) {

                      var tweetIds = [];

                      var oddPair = pair[0]; // Variable to find odd account with index of pair[0]
                      var evenPair = pair[1]; // Variable to find even account with index of pair[1]

                      // Create temp Twit object with current accounts info
                      var oddTwit = new Twitter({
                        consumer_key:         oddSplit[oddPair].consumer_key,
                        consumer_secret:      oddSplit[oddPair].consumer_secret,
                        access_token_key:         oddSplit[oddPair].access_token,
                        access_token_secret:  oddSplit[oddPair].access_token_secret,
                        timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests. 
                      });

                      var evenTwit = new Twitter({
                        consumer_key:         evenSplit[evenPair].consumer_key,
                        consumer_secret:      evenSplit[evenPair].consumer_secret,
                        access_token_key:         evenSplit[evenPair].access_token,
                        access_token_secret:  evenSplit[evenPair].access_token_secret,
                        timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests. 
                      });


                      // Utilize those Twit objects!
                      // -----------------------------------------------------------------



                      // Get the pair's last favorited tweet


                        oddTwit.get('favorites/list', { count: 3 }, function(err, tweets, response) {

                          if (err) {
                            console.log(err);
                          } else {
                            var currentTweetCounter = 0;
                            if (typeof tweets[currentTweetCounter] !== 'undefined') {
                              

                              tweets.forEach(function(tweet) {
                                evenTwit.post('statuses/retweet/' + tweet.id_str, function(err, tweet, response) {
                                  if (err) {
                                    console.log(err);
                                  } else {
                                    console.log(tweet);
                                    currentTweetCounter++;

                                     client.query('SELECT * FROM records WHERE username =' + '\'' + evenSplit[evenPair].username + '\'', function(err, results) {
                                      if (err) {
                                        console.log(err);
                                      } else {
                                        var recordExists = results.rows.length;
                                        updateRecord(recordExists, results);
                                      }

                                    });

                                    function updateRecord(recordExists, results) {

                                      if (recordExists > 0) {
                                        
                                        
                                        var tradeCount = results.rows[0].trades + 1;

                                        client.query('UPDATE records SET trades = ' + '\'' + tradeCount + '\'' + 'WHERE username = ' + '\'' + evenSplit[evenPair].username + '\'')

                                      } else {
                                        client.query("INSERT INTO records(username, trades, timestamp) values($1, $2, $3)", [evenSplit[evenPair].username, 1, timestamp]);
                                      }

                                    }
                                    setTimeout(function() {

                                      evenTwit.post('statuses/destroy/' + tweet.id_str, function(err, tweet, response) {
                                        
                                        if (err) {
                                          console.log(err);
                                        } else {
                                          console.log(tweet);
                                        }

                                      });

                                    }, 1000 * 60 * 19.5);

                                  }
                                }); // retweet post
                              }); // tweets for each
                            } else {

                              console.log("Tweet not there");

                            }
                          }

                        });

                        evenTwit.get('favorites/list', { count: 3 }, function(err, tweets, response) {
                          if (err) {
                            console.log(err);
                          } else {
                            var currentTweetCounter = 0;

                            if (typeof tweets[currentTweetCounter] !== 'undefined') {

                             

                              tweets.forEach(function(tweet) {
                                oddTwit.post('statuses/retweet/' + tweet.id_str, function(err, tweet, response) {
                                  if (err) {
                                    console.log(err);

                                  } else {
                                    console.log(tweet);
                                    currentTweetCounter++;

                                     client.query('SELECT * FROM records WHERE username =' + '\'' + oddSplit[oddPair].username + '\'', function(err, results) {
                                      if (err) {
                                        console.log(err);
                                      } else {
                                        console.log(results);
                                        var recordExists = results.rows.length;
                                        updateRecord(recordExists, results);
                                      }

                                    });

                                    function updateRecord(recordExists, results) {

                                      if (recordExists > 0) {
                                        
                                        
                                        console.log(results.rows[0].trades);
                                        console.log(tradeCount);
                                        var tradeCount = results.rows[0].trades + 1;

                                        client.query('UPDATE records SET trades = ' + '\'' + tradeCount + '\'' + 'WHERE username = ' + '\'' + oddSplit[oddPair].username + '\'')

                                      } else {
                                        client.query("INSERT INTO records(username, trades, timestamp) values($1, $2, $3)", [oddSplit[oddPair].username, 1, timestamp]);
                                      }

                                    }

                                    setTimeout(function() {

                                      evenTwit.post('statuses/destroy/' + tweet.id_str, function(err, tweet, response) {
                                        
                                        if (err) {
                                          console.log(err);
                                        } else {
                                          console.log(tweet);
                                        }

                                      });

                                    }, 1000 * 60 * 19.5);

                                  }
                                });
                              });
                            }

                          }
                        });                 

                    }); // forEach


                    clearInterval(timer);
                    clearInterval(executeTimer);

                    resetInterval();


                  }, 1000 * 60 * 20);
}







// SQL functions that I might need sometimes
//---------------------------------------------------------------------


// DELETE AN ACCOUNT ---------------------------------------------------------------------
  
  //Ajax route to grab the users
  app.get('/api/v1/users', requireLogin, requireAdmin, function(req, res) {
      var results = [];

      pg.connect(connectionString, function(err, client, done) {
          // Handle connection errors
          if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
          }

          // SQL Query > Create the row with new user
          var query = client.query("SELECT * FROM users");

          // Stream results back one row at a time
          query.on('row', function(row) {
              results.push(row);
          });

          // After all data is returned, close connection and redirect to /forms
          query.on('end', function() {
              done();
              return res.json(results);
          });
        });
  });

  //Ajax route to grab the accounts
  app.get('/api/v1/accounts', requireLogin, requireAdmin, function(req, res) {
    if (!req.session.user) {
      res.redirect('/signin');
    } else {
      var results = [];

      pg.connect(connectionString, function(err, client, done) {
          // Handle connection errors
          if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
          }

          // SQL Query > Create the row with new user
          var query = client.query("SELECT * FROM accounts");

          // Stream results back one row at a time
          query.on('row', function(row) {
              results.push(row);
          });

          // After all data is returned, close connection and redirect to /forms
          query.on('end', function() {
              done();
              return res.json(results);
          });
        });
      }
  });




app.get('/api/v1/records', requireAdmin, function(req, res) {
  if (!req.session.user) {
    res.redirect('/signin');
  } else {
    var results = [];

    var records = client.query('SELECT * FROM records');

    records.on('row', function(row) {
      results.push(row);
    });

    records.on('end', function() {
      return res.json(results);
    });

  }

});


app.get('/api/v1/send-rts', requireAdmin, function(req, res) {

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
        console.log('Initializing rts message from: ' + account.username);

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
              } else {

                var messageParams = {
                  screen_name: sender.sender,
                  text: 'rts'
                };

                twitterClient.post('direct_messages/new', messageParams, function(err, message, response) {
                  if (err) {
                    console.log("Morning Messages: ", err);
                  }


                  var query = client.query('UPDATE list SET history = $1, sent = $2, outbound = $5 WHERE list.sender = $3 AND list.account_id = $4', [false, true, sender.sender, sender.account_id, true], function(err) {

                  console.log("Manual Morning Message Sent To: " + sender.sender);

                  });


                });

              }

            }

          });

        });

      }); // Accounts For Each

      res.json('Successfully Sent Rts');
    }

});

app.post('/api/v1/delete-account', requireAdmin, function(req, res) {
  
  var account_id = req.body.username;
  console.log(account_id);
  var query = client.query('DELETE FROM list WHERE account_id = $1', [account_id], function(err) {
    if (err) {
      res.json(err);
    } else {
      var query = client.query('DELETE FROM lmkwd WHERE account_id = $1', [account_id], function(err) {
        if (err) {
          res.json(err);
        } else {
          var query_two = client.query('DELETE FROM que WHERE account_id = $1', [account_id], function(err) {
            if (err) {
              res.json(err);
            } else {
              var query_three = client.query('DELETE FROM manualaccounts WHERE id = $1', [account_id], function(err) {
                if (err) {
                  res.json(err);
                } else {
                  console.log("Removed Account: ", account_id);
                  res.json("OK");
                }
              });
            }
          });
        }
      });
    }
  })
  
  
});

app.get('/api/v1/send-lmkwd', requireAdmin, function(req, res) {

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
     
      accounts.forEach(function(account) {
        var twitterClient = new Twitter({
          consumer_key: account.consumer_key,
          consumer_secret: account.consumer_secret,
          access_token_key: account.access_token,
          access_token_secret: account.access_token_secret,
          timeout_ms: 60 * 1000
        });
        console.log('Initializing rts message from: ' + account.username);

        var eachListed = [];

        var added = [];

        var getHistory = client.query('SELECT * FROM list JOIN manualaccounts ON (list.account_id = manualaccounts.id) WHERE manualaccounts.id = $1 AND list.lmkwd = $2', [account.id, true]);

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
              } else {

                var messageParams = {
                  screen_name: sender.sender,
                  text: 'lmkwd'
                };

                twitterClient.post('direct_messages/new', messageParams, function(err, message, response) {
                  if (err) return console.log(err);

                    console.log("Manual LMKWD Message Sent To: " + sender.sender);


                });

              }

            }

          });

        });

      }); // Accounts For Each

    });

      res.json('Successfully Sent Lmkwd');

});

var twitterLoginClient = new TwitterLogin({

    consumerKey: 'DRVRY2btjcAPSxfioHtZvMI7H',
    consumerSecret: 'P6S6ryN0DiXYUotQtaPKZjWn7eWDFBypY0YQ4dPMZCxcMwdWAP',
    callback: 'http://162.243.249.75:3000/twitter-callback'
    // This is re-assigned in the authentication process for early assignment of consumer keys and secrets

});

var _requestSecret;

app.get('/request-token', function(req, res) {

    var availableApps = [];

    var getApp = client.query('SELECT * FROM apps WHERE amount < 15 ORDER BY app_name ASC');

    getApp.on('row', function(row) {

      availableApps.push(row);

    });

    getApp.on('end', function() {

        var twitterLoginClient = new TwitterLogin({

            consumerKey: availableApps[0].consumer_key,
            consumerSecret: availableApps[0].consumer_secret,
            callback: 'http://162.243.249.75:3000/twitter-callback'

        });

        twitterLoginClient.getRequestToken(function(err, requestToken, requestSecret) {

          if (err)
                  res.status(500).send(err);
              else {
                  _requestSecret = requestSecret;
                  req.session.app_name = availableApps[0].app_name;
                  req.session.consumer_key = availableApps[0].consumer_key;
                  req.session.consumer_secret = availableApps[0].consumer_secret;
                  res.redirect("https://api.twitter.com/oauth/authenticate?oauth_token=" + requestToken);

                  console.log("Consumer Key: " + availableApps[0].consumer_key);
                  console.log("Consumer Secret: " + availableApps[0].consumer_secret);
          }

        });

    });

    

});

app.get('/twitter-callback', function(req, res) {

    console.log("Almost There");
    res.redirect('/access-token?oauth_token=' + req.query.oauth_token + '&oauth_verifier=' + req.query.oauth_verifier);

});

app.get("/access-token", function(req, res) {
        var requestToken = req.query.oauth_token,
        verifier = req.query.oauth_verifier;

        twitterLoginClient.getAccessToken(requestToken, _requestSecret, verifier, function(err, accessToken, accessSecret) {
            if (err) {
                res.status(500).send(err);
                console.log(err);

            } else {
                // twitterLoginClient.verifyCredentials(accessToken, accessSecret, function(err, user) {
                //     if (err)
                //         res.status(500).send(err);
                //     else
                //       req.session.latestAccessToken = accessToken;
                //       req.session.latestAccessSecret = accessSecret;
                //       console.log("We Got Here");

                //       // res.redirect('/create-account');
                // });

                req.session.latestAccessToken = accessToken;
                req.session.latestAccessSecret = accessSecret;

                res.redirect('/create-account');

            }
        });
});



app.get('/create-account', function(req, res) {
    var latestAccessToken = req.session.latestAccessToken;
    var latestAccessSecret = req.session.latestAccessSecret;

    console.log(latestAccessSecret);
    console.log(latestAccessToken);

    res.locals.latestAccessToken = latestAccessToken;
    res.locals.latestAccessSecret = latestAccessSecret;

    res.render('create-account');

});


app.post('/create-account-db', function(req, res) {

            var findAccount = client.query('select * from manualaccounts where username = $1', [req.body.username]);

            var foundAccount = [];

            findAccount.on('row', function(row) {
              foundAccount.push(row);
            });

            findAccount.on('end', function() {

              if (foundAccount.length > 0) {

                var data = {
                  consumer_key: req.session.consumer_key,
                  consumer_secret: req.session.consumer_secret,
                  access_token: req.body.accessToken,
                  access_token_secret: req.body.accessSecret
                }

                console.log(req.body.accessToken);
                console.log(req.body.accessSecret);

                var updateAccount = client.query('UPDATE manualaccounts SET consumer_key = $1, consumer_secret = $2, access_token = $3, access_token_secret = $4 where username = $5', [data.consumer_key, data.consumer_secret, data.access_token, data.access_token_secret, req.body.username]);

                updateAccount.on('end', function() {

                  var incrementAmount = client.query('UPDATE apps SET amount = amount + 1 WHERE app_name = $1', [req.session.app_name]);

                });


              } else {

              var data = {
                username: req.body.username,
                email: null,
                password: null,
                consumer_key: req.session.consumer_key,
                consumer_secret: req.session.consumer_secret,
                access_token: req.body.accessToken,
                access_token_secret: req.body.accessSecret,
                timestamp: null,
                admin: false,
                status: true,
                active: true
              }

              var query = client.query("INSERT INTO manualaccounts(username, email, password, consumer_key, consumer_secret, access_token, access_token_secret, timestamp, admin, status, active) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", [data.username, data.email, data.password, data.consumer_key, data.consumer_secret, data.access_token, data.access_token_secret, data.timestamp, data.admin, data.status, data.active]);

              query.on('end', function() {

                var incrementAmount = client.query('UPDATE apps SET amount = amount + 1 WHERE app_name = $1', [req.session.app_name]);


              });

              }

            });

            console.log(data);

});

app.post('/api/v1/toggle-account', requireAdmin, function(req, res) {

  var account_id = req.body.account_id;
  console.log(account_id);

  var foundAccount = [];

  var query = client.query('SELECT * FROM manualaccounts WHERE id = $1', [account_id]);

  query.on('row', function(row) {

    foundAccount.push(row);

  });

  query.on('end', function() {

    if (foundAccount[0].active) {
      var query = client.query("UPDATE manualaccounts SET active = 'false' WHERE id = $1", [account_id]);
    } else {
      var query = client.query("UPDATE manualaccounts SET active = 'true' WHERE id = $1", [account_id]);
    }

  });

});

app.post('/api/v1/search-accounts', function(req, res) {

  var username = "%" + req.body.username + "%";

  var foundAccounts = [];

  var query = client.query("SELECT * FROM manualaccounts WHERE LOWER(username) LIKE LOWER($1) ORDER BY username ASC", [username]);

  query.on('row', function(row) {

    foundAccounts.push(row);

  });

  query.on('end', function() {

    res.json(foundAccounts);

  });

});

app.get('/api/v1/disable-all', function(req, res) {

  var disableAll = client.query('UPDATE manualaccounts SET status = false', function(err) {
      if (err) {

          res.json(err);

      } else {

          res.json("Disabled All Accounts");

      }
  });

});

app.get('/api/v1/enable-all', function(req, res) {

  var enableAll = client.query('UPDATE manualaccounts SET status = true', function(err) {
      if (err) {

          res.json(err);

      } else {

          res.json("Enabled All Accounts");

      }
  });

});






















  // Form delete route
  app.post('/deleteaccount', requireLogin, requireAdmin, function(req, res) {
    var deleteId = req.body.accountId;
    var passwordInput = req.body.password;
    deleteAccount(deleteId, passwordInput);
    res.redirect('/forms');
  });

      // Get a Postgres client from the connection pool
  function deleteAccount(deleteId, passwordInput) {
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        var account = client.query("SELECT * FROM accounts WHERE id=(" + deleteId + ")");


        if (account !== null) {
          if(account !== undefined) {
              // SQL Query > Create the row with new user
              var query = client.query("DELETE FROM accounts WHERE id=(" + deleteId + ")");

              // Stream results back one row at a time
              query.on('row', function(row) {
                  results.push(row);
              });

              // After all data is returned, close connection and redirect to /forms
              query.on('end', function() {
                  done();
              });
            }
          } 
      });
  }

// END Delete an account ---------------------------------------------------------------------




// TEST AREA ------------------------------------------------------------------------------------------------




// TEST AREA -----------------------------------------END-------------------------------------------------------


// NOTES

// Removed 24 hour DELETE function from history
//----
// WHen a user is traded with, app uses stream to to watch for messages received that include D20

// If we receive that message user gets removed from history and are eligable to trade with again..
// If we don't receive that message for 48 hours, they are black listed



// ---------- ERROR CATCHES ----------------------




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
