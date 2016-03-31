$(document).on('ready', function() {

	$('.js-get-records').on('click', function() {

		$.ajax({

			type: 'GET',

			url: '/api/v1/records',

			success: function(response) {
				$('.js-records').empty();

				showRecords(response);
			},

			error: function() {
				console.log("Something went wrong while grabbing the records...");
			}

		}); // Ajax

	}); // onClick


	function showRecords(response) {
		var records = response;

			records.forEach(function(record) {
				var record = `
						<tr>
							<th scope='row'>${record.username}</th>
							<td>${record.trades}</td>
							<td>${record.timestamp}</td>

						</tr>
						
					`

				var totalRecords = records.length;

				var totalCount = `
						${totalRecords}
					`

				$('.js-total-records').html(totalCount);
				$('.js-records').append(record);
			}); // forEach
	}


}); // Doc ready