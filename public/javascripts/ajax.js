$(document).on('ready', function() {

	$.ajax({
		type: 'GET',

		url: '/api/v1/accounts',

		success: function(response) {
			$('.delete-account-options').empty();

			loadAccounts(response);
		},

		error: function() {
			console.log('Sorry, couldn\'t grab the accounts for you.');
		}
	}); // Ajax

	function loadAccounts(accounts) {
		accounts.forEach(function(account) {
			var options = `
					<option value='${account.id}'>${account.username}</option>
				`

				$('.delete-account-options').append(options);
		});
	}



	$('.js-active-accounts').click(function() {
		
	});

}); // Doc ready