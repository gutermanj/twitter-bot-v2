$(document).ready(function() {

	$('.js-manual-que-add').on('click', function() {
		var username = $(this).data('username');
		var sender = "Potato";
		$('#show-new-que-modal').modal('toggle');
		var input = `
			<input value='${username}' class='js-new-que-username form-control'>
		`
		$('.js-new-que-account-input').html(input);
		$('.js-new-que-sender').val("");

	});

	$('.js-add-sender').on('click', function(e) {

		var username = $('.js-new-que-username').val();
		var sender = $('.js-new-que-sender').val();

		manualAdd(username, sender);

	});


	function manualAdd(username, sender) {

		$.ajax({

			type: 'POST',

			url: '/api/v1/add-que',

			data: {
				username: username,
				sender: sender
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("error");
			}

		});

	}


	$('input[id="auto-switch"]').on('switchChange.bootstrapSwitch', function(event, state) {
			disabled:true
			console.log("ifwjeifjwpfio");
			console.log("This: " + this);
			console.log("Event: " + event);
			console.log("State: " + state);

			$.ajax({

				url: '/api/v1/toggle',

				type: 'GET',

				success: function(response) {
					console.log("Market Started!");
					console.log(response);
					stability();
				},

				error: function() {
					console.log("Something went wrong");
				}

			});

	});




	// Manual

	$('input[id="manual-switch"]').on('switchChange.bootstrapSwitch', function(event, state) {
			disabled:true

			$.ajax({

				url: '/api/v1/manual',

				type: 'GET',

				success: function(response) {
					console.log(response);
					
				},

				error: function() {
					console.log("Something went wrong");
				}

			});

	});



});