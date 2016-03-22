var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');
var assert = require('assert');
var Twit = require('twit');


// Database configuration
var pg = require('pg');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/twitterbot';

var client = new pg.Client(connectionString);

// Creating tables
// ----------------------------------------
// var query = client.query('CREATE TABLE accounts(id SERIAL PRIMARY KEY, username VARCHAR(150) not null, email VARCHAR(150) not null, password VARCHAR(150) not null, consumer_key VARCHAR(150) not null, consumer_secret VARCHAR(150) not null, access_token VARCHAR(150) not null, access_token_secret VARCHAR(150) not null, price VARCHAR(150) not null, complete BOOLEAN)');
// query.on('end', function() { client.end(); });

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

var T = new Twit({
  consumer_key:         '...',
  consumer_secret:      '...',
  access_token:         '...',
  access_token_secret:  '...',
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

function requireLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/signin');
  } else {
    next();
  }
}



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





function splitAccounts(res) {
  
  var even = [];

  var odd = [];

  pg.connect(connectionString, function(err, client, done) {

    if(err) {
      done();
      console.log(err);
      return res.status(500).json({ success: false, data: err });
    }

    var evenAccounts = client.query("SELECT * FROM accounts WHERE (ID % 2) = 0");

    var oddAccounts = client.query("SELECT * FROM accounts WHERE (ID % 2) <> 0");

    evenAccounts.on('row', function(row) {
      even.push(row);
    });

    evenAccounts.on('end', function() {
      var evenAccounts = JSON.stringify(even);
      console.log("Even Accounts: " + evenAccounts);
    });

    oddAccounts.on('row', function(row) {
      odd.push(row);
    });

    oddAccounts.on('end', function() {
      var oddAccounts = JSON.stringify(odd);
      console.log("Odd Accounts: " + oddAccounts);
      done();
    });


  }); // pg.connect
} // function











// --------------- Mostly Routes ---------------------

// Signup route, I'm probably gonna remove this when I deploy
app.get('/signup', function(req, res, next) {
  res.render('signup');
});

app.post('/signup', function(req, res, next) {
  
  // Turn that password into some funkyness
  var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));

    var results = [];

    // Grab data from http request
    var data = {
      username: req.body.username,
      email: req.body.email,
      password: hash,
      complete: false
    };

    req.session.user = data; // Set session from user just created

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Create the row with new user
        client.query("INSERT INTO users(username, email, password, complete) values($1, $2, $3, $4)", [data.username, data.email, data.password, data.complete]);

        // SQL Query > Grab last user created for session
        var query = client.query("SELECT * FROM users ORDER BY id DESC LIMIT 1");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            res.redirect('/');
        });
      });

  });


// Signin route
app.get('/signin', function(req, res) {
  if(!req.session.user) {
    res.render('signin');
  } else {
    res.redirect('/');
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
        var emailInput = req.body.email;
        var passwordInput = req.body.password;
        // See if the email exists
        var query = client.query('SELECT * FROM users WHERE email =' + '\'' + emailInput + '\'');

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
          console.log(results[0]);
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
        });
      });
  });


// Logout route
app.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});


// Dashboard route
app.get('/', requireLogin, function(req, res, next) {

    // Get some info for the charts
    var userCount = [];
    var accountCount = [];

    splitAccounts(res);

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
            res.locals.accountCount = accountCount[0];
            res.render('index', { title: 'Twitter Bot | Dash' });
        });

    });


  console.log("Current Session: " + req.session.user);
  res.locals.user = req.session.user;

});


// Charts route
app.get('/charts', requireLogin, function(req, res) {
  res.locals.user = req.session.user;
  res.render('charts', { title: 'Twitter Bot | Charts' });
});


// Forms route
app.get('/forms', requireLogin, function(req, res) {
  res.locals.user = req.session.user;
  res.render('forms', { title: 'Twitter Bot | Forms' });
});


// New account created by admin
app.post('/newaccount', requireLogin,function(req, res) {

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
      complete: false
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
        client.query("INSERT INTO accounts(username, email, password, consumer_key, consumer_secret, access_token, access_token_secret, price, timestamp, complete) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", [data.username, data.email, data.password, data.consumer_key, data.consumer_secret, data.access_token, data.access_token_secret, data.price, data.timestamp, data.complete]);


        // SQL Query > Last account created
        var query = client.query("SELECT * FROM accounts ORDER BY id DESC LIMIT 1");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            return res.json(results);
        });


    });
});





// New Tweet POST routes

app.post('/tweet', requireLogin, function(req, res) {
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
  T.get('search/tweets', { q: '@julianguterman since:2011-07-11', count: 10 }, function(err, data, response) {
    console.log(data)
  })

}






// SQL functions that I might need sometimes
//---------------------------------------------------------------------


// DELETE AN ACCOUNT ---------------------------------------------------------------------
  
  //Ajax route to grab the users
  app.get('/api/v1/users', requireLogin, function(req, res) {
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
  app.get('/api/v1/accounts', requireLogin, function(req, res) {
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


  // Form delete route
  app.post('/deleteaccount', requireLogin, function(req, res) {
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
