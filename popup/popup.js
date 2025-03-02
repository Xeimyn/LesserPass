// Gets called when the window opens.
document.addEventListener("DOMContentLoaded", async () => {
	const siteElement           = document.getElementsByClassName("site")[0];
	const loginElement          = document.getElementsByClassName("login")[0];
	const masterPasswordElement = document.getElementsByClassName("masterPassword")[0];
	const outputElement         = document.getElementsByClassName("output")[0];
	const indexElement          = document.getElementsByClassName("indexInput")[0];
	const lengthElement         = document.getElementsByClassName("lengthInput")[0];


	// TODO | get these from local storage
	const settings = {
		"urlFormatting": {
			"stripSubDomain": true,
			"stripPath"     : true,
			"stripProtocol" : true
		}
	};


	// used to gen a password if any of the inputs change
	[siteElement, loginElement, masterPasswordElement,indexElement,lengthElement].forEach(function(element) {
		element.addEventListener("keyup", async function() {
			const site = siteElement.value;
			const login = loginElement.value;
			const masterPassword = masterPasswordElement.value;
			const index = indexElement.value

			const length = lengthElement.value;
			const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:'\",.<>?/`~"

			if (site != "" && login != "" && masterPassword != "") {
				let finalPW = await genPW(site,login,masterPassword,length,chars)
				outputElement.value = finalPW
			} else {
				outputElement.value = '';
			}
		});
	 });


	// used to copy to clipboard when confirming masterpw via enter
	masterPasswordElement.addEventListener("keyup", function(event) {
		if (event.key === "Enter") {
			navigator.clipboard.writeText(outputElement.value).then(() => {
				console.log('Password copied to clipboard');
			}).catch(err => {
				console.error('Could not copy text: ', err);
			});
		}
	});


	async function genPW(site, login, masterPassword, length, chars) {
		const encoder = new TextEncoder();
		const salt = encoder.encode(site + login); // Use site + login as a fixed salt to ensure deterministic output

		let derivedBits;
		if (window.crypto.subtle.importKey && window.crypto.subtle.deriveBits) {
			try {
				// Generate key material from master password using PBKDF2
				const keyMaterial = await window.crypto.subtle.importKey(
					"raw", encoder.encode(masterPassword), { name: "PBKDF2" }, false, ["deriveBits"]
				);

				// Derive a 256-bit key using PBKDF2 with 310,000 iterations for security
				derivedBits = await window.crypto.subtle.deriveBits(
					{ name: "PBKDF2", salt: salt, iterations: 310000, hash: "SHA-256" },
					keyMaterial, 256
				);
			} catch (error) {
				console.warn("PBKDF2 failed, falling back to SHA-256.");

				// Fallback: Directly hash the concatenated inputs using SHA-256
				const data = encoder.encode(site + login + masterPassword);
				const hashBuffer = await crypto.subtle.digest('SHA-256', data);
				derivedBits = new Uint8Array(hashBuffer);
			}
		} else {
			console.warn("Crypto API not supported, using SHA-256 fallback.");

			// Fallback: Directly hash the concatenated inputs using SHA-256
			const data = encoder.encode(site + login + masterPassword);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			derivedBits = new Uint8Array(hashBuffer);
		}

		// Convert derived bits to an array of usable characters from the provided charset
		const hashArray = Array.from(new Uint8Array(derivedBits));
		let passwordChars = [];
		for (let i = 0; i < length; i++) {
			// Generate an index by mixing two different bytes from the hash, reducing modulo bias
			let index = (hashArray[i] + hashArray[(i + length) % hashArray.length]) % chars.length;
			passwordChars.push(chars[index]);
		}

		// Return the final generated password as a string
		return passwordChars.join('');
	}





	// Get current tab URL
	const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
	const cleanURL = cleanUrl(tab.url,settings.urlFormatting)


	// insert url to url field
	siteElement.value = cleanURL
	masterPasswordElement.focus()
});


function cleanUrl(url,urlFormattingSettings) {
	// Important, we have to strip the subdomain before the protocol since it relies on a protocol being present
	if (urlFormattingSettings.stripSubDomain) {
		url = url.replace(/([a-zA-Z0-9-]+\.)+(?=[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g, '')
	}
	if (urlFormattingSettings.stripProtocol) {
		url = url.replace(/^([a-zA-Z\d+\-.]*):\/\//, '');
	}
	if (urlFormattingSettings.stripPath) {
		url = url.replace(/\/.*$/, '')
	}
	return url
}

// // Send message to content script to autofill the password
// function autofillPassword(password) {
// 	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
// 	  chrome.tabs.sendMessage(tabs[0].id, {
// 		action: "autofillPassword",
// 		password: password
// 	  });
// 	});
//   }
