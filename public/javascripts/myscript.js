$(function () {
  $('[data-toggle="tooltip"]').tooltip()
});

$('#new-account-modal').on('shown.bs.modal', function () {
  $('#myInput').focus()
})

