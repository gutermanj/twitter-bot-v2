var express = require('express');
var router = express.Router();

	module.exports = {
		manualFunctions: function() {

			function startManualMarket() {
			  manualRunning = true;
			  manualInterval;
			}
		}
	}


	var manualInterval = setInterval(function() {

	    

	}, 1000);

	// Filter Admin vs. User
	function requireAdmin(req, res, next) {
	  if (!req.session.user.admin) {
	    res.redirect('/me');
	  } else {
	    next();
	  }
	}

	router.get('/api/v1/manual', requireAdmin, function(req, res) {
	  
	  if (manualRunning) {

	    clearInterval(manualInterval);
	    
	    return res.json("Manual Proccess Stopped!");
	    manualRunning = false;
	    res.redirect('/dashboard');


	  } else {

	    startManualMarket();
	    return res.json("Manual Proccess Started!");

	    res.redirect('/dashboard');

	  }


	});

module.exports = router;

