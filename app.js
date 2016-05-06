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
var flash = require('connect-flash');
var manual = require('./config/manual.js'); // Include manual config file 
var messages = require('./config/messages.js');
var mongodb = require("mongodb");


// Database configuration
var pg = require('pg');

pg.defaults.ssl = true;

var connectionString = 'postgres://zqjwdkhttstwfx:ykFbgDKz8eTpXM3CCyim6Zyw-m@ec2-54-235-246-67.compute-1.amazonaws.com:5432/d43r3ued3buhe1';



 // || 'postgres://localhost:5432/twitterbot'

// var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/twitterbot';

// var connectionString = process.env.DATABASE_URL || 'postgres://postgres:potato@localhost:5432/twitterbot';


console.log("Change supervisor back to forever for production and remove me!");

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

MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    //HURRAY!! We are connected. :)
    console.log('Connection established to', url);

    // do some work here with the database.

    //Close connection
    db.close();
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
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
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
  console.log(timestamp);

// END TIMESTAMP




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
        var query = client.query("INSERT INTO manualaccounts(username, email, password, consumer_key, consumer_secret, access_token, access_token_secret, timestamp, admin) values($1, $2, $3, $4, $5, $6, $7, $8, $9)", [data.username, data.email, data.password, data.consumer_key, data.consumer_secret, data.access_token, data.access_token_secret, data.timestamp, data.admin]);

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
        var account = { _id: req.body.username, children: [], history: [] };

        // Insert some users
        collection.insert([account], function (err, result) {
          if (err) {
            console.log(err);
          } else {
            console.log('Created que for: ', account.username);
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
    res.render('signin');
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
                console.log("LOGIN QUERY RESULTS: " + user);
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
    res.redirect('/dashboard');
  }   else {
    res.render('admin-signin');
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
                console.log("LOGIN QUERY RESULTS: " + user);
                res.redirect('/dashboard');
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



app.get('/', function(req, res) {
  res.render('land', { title: "Phenomenal" });
});


// Dashboard route
app.get('/dashboard', requireLogin, requireAdmin, function(req, res, next) {

    // Get some info for the charts
    var userCount = [];
    var accountCount = [];
    var manualAccountCount = [];

    

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Last account created
        var users = client.query("SELECT COUNT(*) FROM users");

        // haha, account count
        var accounts = client.query("SELECT COUNT(*) FROM accounts");

        var manualAccounts = client.query("SELECT COUNT(*) FROM manualaccounts");

        // Stream results back one row at a time
        users.on('row', function(row) {
            userCount.push(row);
        });

        // After all data is returned, close connection and return results
        users.on('end', function() {
            res.locals.userCount = userCount[0];
            console.log(userCount[0].count);
            done();
        });



        // Stream results back one row at a time
        accounts.on('row', function(row) {
          accountCount.push(row);
        });

        // After all data is returned, close connection and return results
        accounts.on('end', function() {
            done();
            console.log(accountCount);
            res.locals.running = running;
            res.locals.manualRunning = manualRunning;
            res.locals.accountCount = accountCount[0];
            // splitAccounts(res);

            
        });

        manualAccounts.on('row', function(row) {
          manualAccountCount.push(row);
        });

        manualAccounts.on('end', function() {
          res.locals.manualAccountCount = manualAccountCount[0];
          console.log("MANUAL ACCOUNT COUNT: " + manualAccountCount[0].count);
          done();
          mongoquery();
        });

    });


    function mongoquery() {
      MongoClient.connect('mongodb://owner:1j64z71j64z7@ds023520.mlab.com:23520/heroku_7w0mtg13', function (err, db) {
        if (err) {
          console.log('Unable to connect to the mongoDB server. Error:', err);
        } else {

          var collection = db.collection('accounts');

          collection.find({}).toArray(function(err, result) {
                if (err) {
                  console.log(err);
                } else {
                  res.locals.manAccounts = result;
                  res.locals.main = JSON.stringify(result[0]._id).replace(/['"]+/g, '');
                  res.locals.main2 = JSON.stringify(result[1]._id).replace(/['"]+/g, '');
                  if (result[0].children.length > 0) {
                    res.locals.que = JSON.stringify(result[0].children[0]).replace(/['"]+/g, '');
                  }
                  if (result[1].children.length > 0) {
                    res.locals.que2 = JSON.stringify(result[1].children[0]).replace(/['"]+/g, '');
                  }
                  db.close();

                  res.render('index');
                }
          });

          //Close connection
          
        }
      });
    }
    

  console.log("Current Session: " + req.session.user);
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
      

    }, 10000);
  }


app.post('/api/v1/add-que', function(req, res) {

   MongoClient.connect(url, function(err, db) {
        if (err) {
          console.log("Unable to connect to Mongo. Error: ", err);
        } else {
          var collection = db.collection('accounts');
                collection.update(
                      { _id:  req.body.username },
                      { $push: { children: req.body.sender } }
                    ) // Add sender to que
                    console.log("New Senders Manually Added To Que!", req.body.sender);
                db.close();
                return res.json("OK");
        } // else
      }); // MongoClient

});

app.post('/api/v1/show-que', function(req, res) {

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
          }
        });
        
    }
  });

});

app.post('/api/v1/remove-from-que', function(req, res) {

  MongoClient.connect(url, function(err, db) {
    
    if (err) {
      console.log(err);
    } else {
        var collection = db.collection('accounts');
          collection.update(
            { _id:  req.body.dad },
            { $pull: { children: req.body.username } }
          ) // Remove current trader from que upon completion
          db.close();
    }

  });

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





// ---------------------------------------------------------------------
// END SQL FUNCTIONS that I might need sometimes


// TEST AREA ------------------------------------------------------------------------------------------------



          // T.get('direct_messages', { count: 3 }, function(err, messages, response) {
          //   if (err) {
          //     console.log("direct_messages", err);
          //   } else {
          //     console.log("Pulled Direct Messages...");
          //     messages.forEach(function(message) {
                
          //       console.log(message);

          //     });
          //   }
          // }); // client.get



// // TEST AREA -----------------------------------------END-------------------------------------------------------


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
