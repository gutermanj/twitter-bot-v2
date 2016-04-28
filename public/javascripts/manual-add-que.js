$(document).ready(function() {

	$('.js-manual-que-add').on('click', function() {
		var username = $(this).data('username');
		var sender = "Potato";
		$('#show-new-que-modal').modal('toggle');
		var input = `
			<input value='${username}' class='js-new-que-username form-control'>
		`
		$('.js-new-que-account-input').html(input);
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



});