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

		showCurrentQue(username);

	});



	function showCurrentQue(username) {
		$.ajax({

			type: 'POST',

			url: '/api/v1/show-que',

			data: {
				username: username
			},

			success: function(response) {
				console.log(response.children);
				var dad = response._id;
				console.log(dad);
				var children = response.children;
				var lmkwd_list = response.lmkwd;
				var rts_list = response.history;

				$('.js-current-que').empty();

				children.forEach(function(child) {
					var html = `
						<div class='js-que-parent'>
							<b style='margin-left: 20px;'>${child}</b>
							<span style='margin-left: 20px; cursor: pointer;' aria-hidden='true' class='js-remove-from-que' data-username='${child}'>x</span>
							<hr style='width: 50%; margin-left: -0%;'>
						</div>
					`

					$('.js-current-que').append(html);
				});

				lmkwd_list.forEach(function(child) {
					var html = `
						<div class='js-que-parent'>
							<b style='margin-left: 20px;'>${child}</b>
							<span style='margin-left: 20px; cursor: pointer;' aria-hidden='true' class='js-remove-from-lmkwd' data-username='${child}'>x</span>
							<hr style='width: 50%; margin-left: -0%;'>
						</div>
					`

					$('.js-current-lmkwd').append(html);
				});

				rts_list.forEach(function(child) {
					var html = `
						<div class='js-que-parent'>
							<b style='margin-left: 20px;'>${child}</b>
							<span style='margin-left: 20px; cursor: pointer;' aria-hidden='true' class='js-remove-from-rts' data-username='${child}'>x</span>
							<hr style='width: 50%; margin-left: -0%;'>
						</div>
					`

					$('.js-current-history').append(html);
				});

				$('.js-remove-from-que').on('click', function() {
					var username = $(this).data('username');
					$(this).html('<span>Removed</span>')
					removeFromQue(username, dad);
				});

				$('.js-remove-from-lmkwd').on('click', function() {
					var username = $(this).data('username');
					$(this).html('<span>Removed</span>')
					removeFromLmkwd(username, dad);
				});

				$('.js-remove-from-rts').on('click', function() {
					var username = $(this).data('username');
					$(this).html('<span>Removed</span>')
					removeFromRts(username, dad);
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

	function removeFromQue(username, dad) {
		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-que',

			data: {
				username: username,
				dad: dad
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error Removing From Que");
			}

		});

	}

		function removeFromLmkwd(username, dad) {
		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-lmkwd',

			data: {
				username: username,
				dad: dad
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error Removing From Que");
			}

		});

	}

	function removeFromRts(username, dad) {
		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-rts',

			data: {
				username: username,
				dad: dad
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










});