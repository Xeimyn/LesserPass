// Gets called when the window opens.
document.addEventListener("DOMContentLoaded", async () => {
	const siteElement           = document.getElementsByClassName("site")[0];
	const loginElement          = document.getElementsByClassName("login")[0];
	const masterPasswordElement = document.getElementsByClassName("masterPassword")[0];
	const outputElement         = document.getElementsByClassName("output")[0];


	// TODO | get these from local storage
	const settings = {
		"urlFormatting": {
			"stripSubDomain": true,
			"stripPath"     : true,
			"stripProtocol" : true
		}
	};


	// used to gen a password if any of the inputs change
	[siteElement, loginElement, masterPasswordElement].forEach(function(element) {
		element.addEventListener("keyup", async function() {
			const site = siteElement.value;
			const login = loginElement.value;
			const masterPassword = masterPasswordElement.value;

			const length = 16
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
		const data = encoder.encode(site + login + masterPassword);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashString = hashArray.map(b => chars[b % chars.length]).join('');
		return hashString.slice(0, length);
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

// Send message to content script to autofill the password
function autofillPassword(password) {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
	  chrome.tabs.sendMessage(tabs[0].id, {
		action: "autofillPassword",
		password: password
	  });
	});
  }
