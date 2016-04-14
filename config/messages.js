var Twitter = require('twitter');
var pg = require('pg');

pg.defaults.ssl = true;

var connectionString = 'postgres://zqjwdkhttstwfx:ykFbgDKz8eTpXM3CCyim6Zyw-m@ec2-54-235-246-67.compute-1.amazonaws.com:5432/d43r3ued3buhe1';

var client = new pg.Client(connectionString);

module.exports = {

	read: function() {

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
	            done();
	            pullMessages();
	        });


	    }); // pg connect

	    function pullMessages() {

	    	accounts.forEach(function(account) {

	    		var client = new Twitter ({

	    			consumer_key: "OTKBqEdwt3SF25RfCfTLD27qF",
	    			consumer_secret: "qA21rAffPeWZALM57dbdYE7RrqINrVscKsHXqji8jEGJyl09E0",
	    			access_token_key: "200342291-oYf4VLpmteo3VYrob4DF4zakolN1GO2Wr0SOI7L4",
	    			access_token_secret: "m00PWfarPJOkkMstjDaxrBpMQvf8jIbyB7TZUkllyAQn0",
	    			timeout_ms: 60 * 1000

	    		});

	    		client.get('direct_messages', { count: 5 }, function(err, messages, response) {

	    			if (err) {
	    				console.log(err);
	    			} else {

	    				messages.forEach(function(message) {

	    					var splitMessage = message.text.split(" ");
   
						    if (filter(splitMessage)) {
						    	console.log("FILTERED MESSAGE: ");
						        console.log(message.sender.id);
						        console.log("--------------------------------------");
						    }

	    				});

	    			}

	    		}); // client.get
	    		
	    	}); // forEach



	    }

	    function filter(splitMessage) {
   
		    var filters = ["fav", "favs", "rts", "rt\'s"];
		   
		    for (i = 0; i < filters.length; i++) {
		   
		        if (splitMessage.indexOf(filters[i]) > -1) {
		            return true;
		        }
		   
		    }
		}





	} // read: function()

}