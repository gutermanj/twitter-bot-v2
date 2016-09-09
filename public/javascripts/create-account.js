$('.js-create-account').on('click', function() {

	var username = $('.js-username').val();
	var accessToken = $('.js-access-token').val();
	var accessSecret = $('.js-access-secret').val();

	$.ajax({

		url: '/create-account-db',

		type: 'POST',

		data: {
			username: username,
			accessToken: accessToken,
			accessSecret: accessSecret
		},

		success: function(response) {

			console.log(response);

		},

		error: function(err) {

			console.log(err);

		}

	});

});