var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var bcrypt = require('bcryptjs');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/twitterbot';
var Twit = require('twit');
var config = require('./config.js');

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


// Connect to the database
mongoose.connect('mongodb://localhost/twitterbot', function(err, db) {
  if (err) {
    console.log('Something went wrong while connecting to the DB: ');
    console.log(err);
  } else {
    console.log('Connected to the Database :) Don\'t have too much fun!');
  }
});

var session = require('express-session');
var FirebaseStore = require('connect-firebase')(session);


var users = require('./routes/users');


// User Model

var User = mongoose.model('User', new Schema({
  id: ObjectId,
  username: String,
  email: { type: String, unique: true },
  password: String,
}));

// Twitter configuration

var T = new Twit({
  consumer_key:         'YVu6kpgTujnw3YDqZzMKt5gtm',
  consumer_secret:      '57v0LHrZIbuY2V7UG1gebQjadUdOTJrv3Mjgz8XauGoTa9Krfp',
  access_token:         '200342291-56EYNCD1rohnHdh5WQW6x3iFImkBM914rAUkuRkB',
  access_token_secret:  'F9IOmWjGS2uD7uxjUyfsr9tDSjl2fIAQNKik61Aiz4FXK',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
});

// Account Model

var Account = mongoose.model('Account', new Schema({
  id: ObjectId,
  username: String,
  password: String,
  consumer_key: String,
  consumer_secret: String,
  access_token: String,
  access_token_secret: String,
  timeout_ms: String, // optional HTTP request timeout to appli to all requests.
}));


// Session Options
var firebaseStoreOptions = {
    // Your FireBase database
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


app.use(function(req, res, next) {
  if (req.session && req.session.user) {
    User.findOne({ username: req.session.username }, function(err, user) {
      if (user) {
        req.user = user;
        delete req.user.password;
        req.session.user = req.user;
        res.locals.user = req.user;
      }
      next();
    });
  } else {
    next();
  }
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/signin');
  } else {
    next();
  }
}



app.get('/signup', function(req, res, next) {
  res.render('signup');
});

app.post('/signup', function(req, res, next) {
  var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));

  var user = new User({
    username: req.body.username,
    email: req.body.email,
    password: hash,
  });

  user.save(function(err) {
      if (err) {
        var err = 'Something bad happened, try again!';
      if (err.code === 11000) {
        var error = 'That email is already taken, try another!';
      }

      res.render('signup.jade', { error: error });
      console.log(err);
      console.log(error);
    } else {
      req.session.user = user; // set-cookie set: session={ email: '...', pass: '...' }
      res.redirect('/');
    }

  });
});


app.get('/signin', function(req, res) {
  if(!req.session.user) {
    res.render('signin');
  } else {
    res.redirect('index');
  }
});

app.post('/signin', function(req, res) {
  User.findOne({ username: req.body.username }, function(err, user) {
    if (!user) {
      res.render('signin.jade', { error: 'Invalid Username or Password' });
      console.log(err);
    } else {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        req.session.user = user; // set-cookie set: session={ email: '...', pass: '...' }
        res.redirect('/');
      } else {
        res.render('signin.jade', { error: 'Invalid Username or Password' });
      }
    }
  });
});


app.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

app.get('/', requireLogin, function(req, res, next) {

    // Connect to database
    MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    findUsers(db, function() {
        db.close();
    });
  });

    // Find the users
    var findUsers = function(db, callback) {
     var users =db.collection('users').find();
     userCount = 0;
       users.each(function(err, users) {
          userCount++;
          assert.equal(err, null);
          if (users != null) {
             console.log(users);
          } else {
            res.locals.usercount = 2;
             callback();
             console.log("User count: " + userCount);
             res.locals.userCount = userCount;
          }

       });
    };
  res.locals.user = req.session.user;
  res.render('index', { title: 'Twitter Bot | Dash' });
});

app.get('/charts', requireLogin, function(req, res) {
  res.locals.user = req.session.user;
  res.render('charts', { title: 'Twitter Bot | Charts' });
});

app.get('/forms', requireLogin, function(req, res) {
  res.locals.user = req.session.user;
  res.render('forms', { title: 'Twitter Bot | Forms' });
});



// New Tweet Hard Coded

function newTweet() {
  T.post('statuses/update', { status: 'Where would we be without APIs? #nodejs #twitter #api' }, function(err, data, response) {
    if (err) {
      console.log(err);
    } else {
      console.log(data)
    }
  });
}


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
