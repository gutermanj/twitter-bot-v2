$(document).ready(function() {

	$('.js-account').on('click', function() {
		var username = $(this).data('username');
		console.log(username);
		var account_id = $(this).data('id');

		var accountInfo = `
			<b>${username} | ${account_id}</b>
		`

		$('.modal-title').html(accountInfo);

		showCurrentQue(username, account_id);

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



	function showCurrentQue(username, account_id) {
		console.log(username);
		console.log(account_id);

		$.ajax({

			type: 'POST',

			url: '/api/v1/show-que',

			data: {
				username: username,
				dad_id: account_id
			},

			success: function(response) {
				console.log(response);
				var dad = response.username;

				var removeAccountHtml = `
					<h4 style='color: darkred;' class='js-delete-account' data-id='${account_id}'>REMOVE ACCOUNT</h4>
				`

				$('.delete-account').html(removeAccountHtml);

				$('.js-current-que').empty();
				$('.js-current-history').empty();
				$('.js-current-lmkwd').empty();
				$('.js-current-sent').empty();

				response.forEach(function(sender) {

					if (sender.qued) {

						var html = `
						<div class='js-que-item'>
                    		<h5>${sender.sender} <i class='glyphicon glyphicon-remove-circle pull-right js-remove-from-que' style='color: gray;' data-username='${sender.sender}' data-id='${sender.account_id}'>  </i></h5>
                  		</div>
					`

					$('.js-current-que').append(html);

					}


				if (sender.sent) {
					var html = `
						<div class='js-sent-item'>
                    		<h5>${sender.sender} <i class='glyphicon glyphicon-remove-circle pull-right js-remove-from-sent' style='color: gray;' data-username='${sender.sender}' data-id='${sender.account_id}'>  </i></h5>
                  		</div>
					`

					$('.js-current-sent').append(html);
				}

				if (sender.lmkwd) {
					var html = `
						<div class='js-lmkwd-item'>
                    		<h5>${sender.sender} <i class='glyphicon glyphicon-remove-circle pull-right js-remove-from-lmkwd' style='color: gray;' data-username='${sender.sender}' data-id='${sender.account_id}'>  </i></h5>
                  		</div>
					`

					$('.js-current-lmkwd').append(html);
				}

				if (sender.history) {
					var html = `
						<div class='js-history-item'>
                    		<h5>${sender.sender} <i class='glyphicon glyphicon-remove-circle pull-right js-remove-from-history' style='color: gray;' data-username='${sender.sender}' data-id='${sender.account_id}'>  </i></h5>
                  		</div>
					`

					$('.js-current-history').append(html);
				}





				});


				$('.js-remove-from-que').on('click', function() {
					var username = $(this).data('username');
					$(this).parent().parent().fadeOut('slow');
					removeFromQue(username, account_id);
				});

				$('.js-remove-from-sent').on('click', function() {
					var username = $(this).data('username');
					$(this).parent().parent().fadeOut('slow');
					removeFromSent(username, account_id);
				});

				$('.js-remove-from-lmkwd').on('click', function() {
					var username = $(this).data('username');
					$(this).parent().parent().fadeOut('slow');
					removeFromLmkwd(username, account_id);
				});

				$('.js-remove-from-rts').on('click', function() {
					var username = $(this).data('username');
					$(this).parent().parent().fadeOut('slow');
					removeFromRts(username, account_id);
				});

			},

			error: function() {
				console.log("Error Getting Que");
			}

		});

		$.ajax({

			url: '/api/v1/get-account-info',

			type: 'POST',

			data: {
				username: username
			},

			success: function(response) {

				console.log(response);

				if (response[0].active) {
					var html = `
						<button class='btn btn-danger account-switch-start' style='right: 15px; position: absolute'>STOP</button>
					`
					$('.js-account-toggle').html(html);
					console.log("STOP");
				} else {
					var html = `
						<button class='btn btn-success account-switch-start' style='right: 15px; position: absolute'>Start!</button>
					`

					$('.js-account-toggle').html(html);
					console.log("START");
				}

			},

			error: function(err) {
				console.log(err);
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

	function removeFromQue(username, account_id) {

		var dad_id = $('.js-new-que-username').val();

		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-que',

			data: {
				username: username,
				dad_id: account_id
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error Removing From Que");
			}

		});

	}

		function removeFromLmkwd(username, account_id) {
		
			console.log(username);
			var dad_id = $('.js-new-que-username').val();

		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-lmkwd',

			data: {
				username: username,
				dad_id: account_id
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error Removing From Que");
			}

		});

	}

	function removeFromSent(username, account_id) {


		console.log(account_id);

		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-sent',

			data: {
				username: username,
				dad_id: account_id
			},

			success: function(response) {
				console.log(response);
			},

			error: function() {
				console.log("Error Removing From Sent");
			}

		});

	}

	function removeFromRts(username, account_id) {

		var dad_id = $('.js-new-que-username').val();

		
		$.ajax({

			type: 'POST',

			url: '/api/v1/remove-from-rts',

			data: {
				username: username,
				dad_id: account_id
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

	$('.js-account-toggle').on('click', function() {
			var id = $('.js-new-que-username').val();

			$.ajax({

				url: '/api/v1/toggle-account',

				type: 'POST',

				data: {
					account_id: id
				},

				success: function(response) {
					console.log("Account Started!");
					console.log(response);
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
	var id = $('.js-new-que-username').val();
	console.log(id);
	
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

//setup before functions
var typingTimer;                //timer identifier
var doneTypingInterval = 250;  //time in ms, 5 second for example
var $input = $('#search-input');

//on keyup, start the countdown
$input.on('keyup', function () {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(doneTyping, doneTypingInterval);
});

//on keydown, clear the countdown 
$input.on('keydown', function () {
  clearTimeout(typingTimer);
});

//user is "finished typing," do something
function doneTyping () {

  	if ($input.val().length == 0) {
  		var username = "";
  	} else {
  		var username = $input.val();
  	}

  	$.ajax({

  		url: '/api/v1/search-accounts',

  		type: 'POST',

  		data: {

  			username: username

  		},

  		success: function(response) {

  			console.log(response);
  			$('.mail').empty();

  			response.forEach(function(account) {

  				if (account.status) {
  					if (account.active) {

  						var html = `
	  					<li data-toggle="modal" href='#myModal' data-id='${account.id}' data-username='${account.username}' class='js-account'>
	  						<i class="unread"></i>
	  						<p class="sender">${account.username}</p>
	  						<p class="message"><strong>Active</strong></p>
	  					</li>
		  				`
		  				$('.mail').append(html);

  					} else {

  						var html = `
	  					<li data-toggle="modal" href='#myModal' data-id='${account.id}' data-username='${account.username}' class='js-account'>
	  						<i class="unread"></i>
	  						<p class="sender">${account.username}</p>
	  						<p class="message"><strong>Active</strong></p>
	  					</li>
		  				`
		  				$('.mail').append(html);

  					}
	   				
	  				console.log("Printed");
  				} else {
  					if (account.active) {

  						var html = `
	  					<li data-toggle="modal" href='#myModal' data-id='${account.id}' data-username='${account.username}' class='js-account'>
	  						<i class="unread" style="background-color: darkred;"></i>
	  						<p class="sender">${account.username}</p>
	  						<p class="message"><strong>Active</strong></p>
	  					</li>
		  				`
		  				$('.mail').append(html);

  					} else {

  						var html = `
	  					<li data-toggle="modal" href='#myModal' data-id='${account.id}' data-username='${account.username}' class='js-account'>
	  						<i class="unread" style="background-color: darkred;"></i>
	  						<p class="sender">${account.username}</p>
	  						<p class="message"><strong>Disabled</strong></p>
	  					</li>
		  				`
		  				$('.mail').append(html);

  					}
  					
	  				console.log("Printed");
  				}

  			});

			$('.js-account').on('click', function() {
			var username = $(this).data('username');
			console.log(username);
			var account_id = $(this).data('id');

			var accountInfo = `
				<b>${username} | ${account_id}</b>
			`

			$('.modal-title').html(accountInfo);

			showCurrentQue(username, account_id);

			});

			$('.js-remove-from-que').on('click', function() {
				$(this).html('<span>Removed</span>')
				removeFromQue(username, account_id);
			});

			$('.js-remove-from-sent').on('click', function() {
				$(this).html('<span>Removed</span>')
				removeFromSent(username, account_id);
			});

			$('.js-remove-from-lmkwd').on('click', function() {
				$(this).html('<span>Removed</span>')
				removeFromLmkwd(username, account_id);
			});

			$('.js-remove-from-rts').on('click', function() {
				$(this).html('<span>Removed</span>')
				removeFromRts(username, account_id);
			});

  		},

  		error: function(err) {

  			console.log(err);

  		}

  	});

}


$('.js-delete-account').click(function(e) {
    e.preventDefault();
    if (window.confirm("Are you sure?")) {
        console.log("DELETED");
    }
});

$('.js-disable-all').on('click', function() {

	$.ajax({

		url: 'api/v1/disable-all',

		success: function(response) {

			console.log(response);

		},

		error: function(err) {

			console.log(err);

		}

	});

});

$('.js-enable-all').on('click', function() {

	$.ajax({

		url: 'api/v1/enable-all',

		success: function(response) {

			console.log(response);

		},

		error: function(err) {

			console.log(err);

		}

	});

});








});