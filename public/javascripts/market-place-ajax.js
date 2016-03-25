$(document).on('ready', function() {

	$('input[name="my-checkbox"]').on('switchChange.bootstrapSwitch', function(event, state) {

		console.log("ifwjeifjwpfio");
		console.log("This: " + this);
		console.log("Event: " + event);
		console.log("State: " + state);

		$.ajax({

			url: '/api/v1/start',

			type: 'GET',

			success: function(response) {
				console.log("Market Started!");
				console.log(response);
			},

			error: function() {
				console.log("Something went wrong");
			}

		});

	});

});