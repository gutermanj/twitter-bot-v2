$(document).on('ready', function() {


	$('.js-active-accounts').on('click', function() {
		$.ajax({
			type: 'GET',

			url: '/api/v1/accounts',

			success: function(response) {
				$('.js-accounts').empty();

				showAccounts(response);
				console.log("Response: " + response);
			},

			error: function() {
				console.log("Sorry, couldn't grab the accounts");
			}
		}); // Ajax



	function showAccounts(response) {
			console.log("Calling function: showAccounts");
			var accounts = response;

			accounts.forEach(function(account) {
				var account = `
						<tr>
							<th scope='row'>${account.id}</th>
							<td>${account.username}</td>
							<td>${account.email}</td>
							<td>18</td>
						</tr>
					`
				$('.js-accounts').append(account);
			}); // forEach

		} // showAccounts

	});

});