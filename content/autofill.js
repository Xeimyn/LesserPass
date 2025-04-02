// // Listen for messages from background or popup scripts to autofill
// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
// 	if (request.action === "autofillPassword") {
// 		const passwordFields = document.querySelectorAll('input[type="password"]');
// 		console.log(passwordFields);

// 		if (passwordFields.length > 0) {
// 			// Check if the field is visible
// 			const isVisible = passwordFields[0].offsetWidth > 0 && passwordFields[0].offsetHeight > 0 && window.getComputedStyle(passwordFields[0]).display !== 'none' && window.getComputedStyle(passwordFields[0]).visibility !== 'hidden';
// 			if (isVisible) {
// 				// Autofill the first visible password field
// 				passwordFields[0].value = request.password;
// 			}
// 		}
// 	}
//   });
