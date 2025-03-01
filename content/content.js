// Listen for messages from background or popup scripts to autofill
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === "autofillPassword") {
	  const passwordFields = document.querySelectorAll('input[type="password"]');
	  if (passwordFields.length > 0) {
		// Autofill the first password field
		passwordFields[0].value = request.password;
	  }
	}
  });
