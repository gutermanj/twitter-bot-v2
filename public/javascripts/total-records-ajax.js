$(document).on('ready', function() {


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



		function showRecords(response) {
			var records = response;

				records.forEach(function(record) {
					

					var totalRecords = records.length;

					var totalCount = `
							${totalRecords}
						`

					$('.js-total-records').html(totalCount);

				}); // forEach
		}

});