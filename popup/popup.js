// Gets called when the window opens.
document.addEventListener("DOMContentLoaded", async () => {
	const siteElement           = document.getElementsByClassName("site")[0];
	const loginElement          = document.getElementsByClassName("login")[0];
	const masterPasswordElement = document.getElementsByClassName("masterPassword")[0];
	const indexElement          = document.getElementsByClassName("indexInput")[0];
	const lengthElement         = document.getElementsByClassName("lengthInput")[0];
	const outputElement         = document.getElementsByClassName("output")[0];

	const minusButtonLength = document.getElementById("minusBL")
	const plusButtonLength  = document.getElementById("plusBL")

	const minusButtonIndex = document.getElementById("minusBI")
	const plusButtonIndex  = document.getElementById("plusBI")

	const toggleViewButton      = document.getElementsByClassName("toggleViewButton")[0];
	const toggleViewButtonImage = document.getElementsByClassName("toggleButtonImg")[0];

	const copiedOverlay = document.getElementsByClassName("copiedOverlay")[0]

	const defaultSettings = {
		"urlFormatting": {
			"stripSubDomain": true,
			"stripPath"     : true,
			"stripProtocol" : true
		},
		"defaultInput":{
			"login"   : "",
			"length"  : 16,
			"index"   : 0,
		},
		"misc": {
			"autofill": true,
			"copiedOverlay": true,
			"focus":null, // [site,login,masterpw,length,index,null]
			"charset" : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVW0123456789!\"$%&()=?#.,<>|_-",
		}
	}

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
				let finalPW = await genPW(site,login,masterPassword,length,index,chars)
				outputElement.value = finalPW
			} else {
				outputElement.value = '';
			}
		});
	 });

	 toggleViewButton.addEventListener("click",function() {
		if (outputElement.type == "password") {
			outputElement.type = "text"
			toggleViewButtonImage.src="../assets/icons/eye_blind.svg"
		} else if (outputElement.type == "text") {
			outputElement.type = "password"
			toggleViewButtonImage.src="../assets/icons/eye.svg"
		}
	 })

	 minusButtonLength.addEventListener("click",function() {
		if (lengthElement.value >= 2) {
			lengthElement.value -=1
		}
		if (lengthElement.value == "") {
			lengthElement.value = 1
		}
	 })

	 plusButtonLength.addEventListener("click",function() {
		lengthElement.value = Number(lengthElement.value) + 1
	 })

	 minusButtonIndex.addEventListener("click",function() {
		if (indexElement.value == "") {
			indexElement.value = 1
			return
		}
		indexElement.value -=1
	 })

	 plusButtonIndex.addEventListener("click",function() {
		indexElement.value = Number(indexElement.value) + 1
	 })

	// used to copy to clipboard when confirming masterpw via enter
	masterPasswordElement.addEventListener("keydown", function(event) {
		if (event.key === "Enter") {
			copyToClipboard(outputElement.value)
		}
	});

	outputElement.addEventListener("click",function() {
		copyToClipboard(outputElement.value)
	})

	function showOverlay() {
		copiedOverlay.style.visibility = "visible"
		setTimeout(() => {
			copiedOverlay.style.visibility = "hidden"
		  }, 1250);
	}

	function copyToClipboard(value) {
		if (value != "") {
			navigator.clipboard.writeText(value).then(() => {
				console.log('Password copied to clipboard');
				showOverlay()
			}).catch(err => {
				console.error('Could not copy text: ', err);
			});
		} else {
			console.log('Not gonna copy empty text')
		}
	}

	async function genPW(site, login, masterPassword, length, index, chars) {
		const encoder = new TextEncoder();
		const salt = encoder.encode(site + login + index); // Include index in the salt to ensure unique output per index

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
				const data = encoder.encode(site + login + masterPassword + index);
				const hashBuffer = await crypto.subtle.digest('SHA-256', data);
				derivedBits = new Uint8Array(hashBuffer);
			}
		} else {
			console.warn("Crypto API not supported, using SHA-256 fallback.");

			// Fallback: Directly hash the concatenated inputs using SHA-256
			const data = encoder.encode(site + login + masterPassword + index);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			derivedBits = new Uint8Array(hashBuffer);
		}

		// Convert derived bits to an array of usable characters from the provided charset
		const hashArray = Array.from(new Uint8Array(derivedBits));
		let passwordChars = [];
		for (let i = 0; i < length; i++) {
			// Generate an index by mixing two different bytes from the hash, reducing modulo bias
			let charIndex = (hashArray[i] + hashArray[(i + length) % hashArray.length]) % chars.length;
			passwordChars.push(chars[charIndex]);
		}

		// Return the final generated password as a string
		return passwordChars.join('');
	}

	// Get current tab URL
	const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
	const cleanURL = cleanUrl(tab.url,settings.urlFormatting)


	// insert url to url field
	siteElement.value = cleanURL
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
function autofillPassword(password) {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
	  chrome.tabs.sendMessage(tabs[0].id, {
		action: "autofillPassword",
		password: password
	  });
	});
  }
