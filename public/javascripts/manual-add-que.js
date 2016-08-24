$(document).ready(function() {

	$('.js-manual-que-add').on('click', function() {
		var username = $(this).data('username');
		console.log(username);
		var id = $(this).data('dad_id');
		var sender = "Potato";
		$('#show-new-que-modal').modal('toggle');
		var input = `
			<input value='${id}' class='js-new-que-username form-control'>
			<br>
			<h4>Account: ${username}</h4>
			<hr>
		`
		$('.js-new-que-account-input').html(input);
		$('.js-new-que-sender').val("");

		showCurrentQue(username);

	});


	$('.js-remove-lmkwd').click(function(e) {
		e.preventDefault();

		var father = $(this).data('dad');
		var child = $(this).data('child');

		removeFromLmkwdNotifications(father, child);
	});

	function removeFromLmkwdNotifications(father, child) {

		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-lmkwd-notifications',

			data: {
				father: father,
				child: child
			},

			success: function(response) {
				console.log("OK");
			},

			error: function(err) {
				console.log(err);
			}

		});

	}



	function showCurrentQue(username) {
		$.ajax({

			type: 'POST',

			url: '/api/v1/show-que',

			data: {
				username: username
			},

			success: function(response) {
				console.log(response);
				var dad = response[0].username;
				var dad_id = response[0].id;

				$('.js-current-que').empty();
				$('.js-current-history').empty();
				$('.js-current-lmkwd').empty();
				$('.js-current-sent').empty();

				response.forEach(function(sender) {

					if (sender.qued) {

						var html = `
						<div class='js-que-parent'>
							<b style='margin-left: 20px;'>${sender.sender}</b>
							<span style='margin-left: 20px; cursor: pointer;' aria-hidden='true' class='js-remove-from-que' data-username='${sender.sender}'>x</span>
							<hr style='width: 50%; margin-left: -0%;'>
						</div>
					`

					$('.js-current-que').append(html);

					}


				if (sender.sent) {
					var html = `
						<div class='js-que-parent'>
							<b style='margin-left: 20px; color: lightgray;'>${sender.sender}</b>
							<span style='margin-left: 20px; cursor: pointer;' aria-hidden='true' class='js-remove-from-sent' data-username='${sender.sender}'>x</span>
							<hr style='width: 50%; margin-left: -0%;'>
						</div>
					`

					$('.js-current-sent').append(html);
				}

				if (sender.lmkwd) {
					var html = `
						<div class='js-que-parent'>
							<b style='margin-left: 20px;'>${sender.sender}</b>
							<span style='margin-left: 20px; cursor: pointer;' aria-hidden='true' class='js-remove-from-lmkwd' data-username='${sender.sender}'>x</span>
							<hr style='width: 50%; margin-left: -0%;'>
						</div>
					`

					$('.js-current-lmkwd').append(html);
				}

				if (sender.history) {
					var html = `
						<div class='js-que-parent'>
							<b style='margin-left: 20px;'>${sender.sender}</b>
							<span style='margin-left: 20px; cursor: pointer;' aria-hidden='true' class='js-remove-from-rts' data-username='${sender.sender}'>x</span>
							<hr style='width: 50%; margin-left: -0%;'>
						</div>
					`

					$('.js-current-history').append(html);
				}

				});

				$('.js-remove-from-que').on('click', function() {
					var username = $(this).data('username');
					$(this).html('<span>Removed</span>')
					removeFromQue(username, dad_id);
				});

				$('.js-remove-from-sent').on('click', function() {
					var username = $(this).data('username');
					$(this).html('<span>Removed</span>')
					removeFromSent(username, dad_id);
				});

				$('.js-remove-from-lmkwd').on('click', function() {
					var username = $(this).data('username');
					$(this).html('<span>Removed</span>')
					removeFromLmkwd(username, dad_id);
				});

				$('.js-remove-from-rts').on('click', function() {
					var username = $(this).data('username');
					$(this).html('<span>Removed</span>')
					removeFromRts(username, dad_id);
				});

			},

			error: function() {
				console.log("Error Getting Que");
			}

		});
	}

	$('.js-add-sender').on('click', function(e) {

		var username = $('.js-new-que-username').val();
		var sender = $('.js-new-que-sender').val();

		manualAdd(username, sender);

	});

	$('.js-new-lmkwd-button').on('click', function(e) {

		var username = $('.js-new-que-username').val();
		var sender = $('.js-new-lmkwd').val();

		lmkwdAdd(username, sender);

	});

	$('.js-new-history-button').on('click', function(e) {

		var username = $('.js-new-que-username').val();
		var sender = $('.js-new-history').val();

		historyAdd(username, sender);

	});

	function removeFromQue(username, dad_id) {
		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-que',

			data: {
				username: username,
				dad_id: dad_id
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error Removing From Que");
			}

		});

	}

		function removeFromLmkwd(username, dad_id) {
		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-lmkwd',

			data: {
				username: username,
				dad_id: dad_id
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error Removing From Que");
			}

		});

	}

	function removeFromSent(username, dad_id) {
		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-sent',

			data: {
				username: username,
				dad_id: dad_id
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error Removing From Sent");
			}

		});

	}

	function removeFromRts(username, dad_id) {
		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-rts',

			data: {
				username: username,
				dad_id: dad_id
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error Removing From Que");
			}

		});

	}


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

		function lmkwdAdd(username, sender) {

		$.ajax({

			type: 'POST',

			url: '/api/v1/add-lmkwd',

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

		function historyAdd(username, sender) {

		$.ajax({

			type: 'POST',

			url: '/api/v1/add-history',

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




	$('.js-new-blacklist-button').on('click', function() {
		$('#add-blacklist-modal').modal("toggle");

	});

	$('.js-add-blacklist-submit').on('click', function() {
		var sender = $('.js-new-blacklist-sender').val();
		addBlacklistAjax(sender);
	});


	function addBlacklistAjax(sender) {

		$.ajax({

			type: 'POST',

			url: '/api/v1/blacklist',

			data: {

				sender: sender

			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error");
			}

		});

	}


$('.js-send-rts').on('click', function() {

	$.ajax({

		url: '/api/v1/send-rts',

		success: function(response) {
			console.log(response);
		},

		error: function(err) {
			console.log(err);
		}

	});

});

$('.js-send-lmkwd').on('click', function() {

	$.ajax({

		url: '/api/v1/send-lmkwd',

		success: function(response) {
			console.log(response);
		},

		error: function(err) {
			console.log(err);
		}

	});

});


// ADD ACCOUNT THROUGH TWITTER


$('.js-add-account').on('click', function() {
	window.location.href = '/request-token';
});
	
	
$('.js-delete-account').on('click', function() {
	var id = $('.js-new-que-account-input').val();
	
	$.ajax({
		
		url: '/api/v1/delete-account',
		
		type: 'POST',
		
		data: {
			username: id
		},
		
		success: function(response) {
			console.log(response);
		},
		
		error: function(err) {
			console.log(err);
		}
		
	});
});


















});