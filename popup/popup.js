// import { pbkdf2 as cryptoPbkdf2 } from "crypto";

// Gets called when the window opens.
document.addEventListener("DOMContentLoaded", async () => {
	const siteElement = document.getElementsByClassName("site")[0];
	const loginElement = document.getElementsByClassName("login")[0];
	const masterPasswordElement = document.getElementsByClassName("masterPassword")[0];
	const outputElement = document.getElementsByClassName("output")[0];

	// TODO | get these from local storage
	const settings = {
		"urlFormatting": {
			"stripSubDomain": true,
			"stripPath": true,
			"stripProtocol": true
		},
		"defaults": {
			"login":"simon"
		}
	}

	function genPW(outputElement) {
		site = siteElement.value
		login = loginElement.value
		masterPW = masterPasswordElement.value
		pw = site
		outputElement.value = pw
	}

	siteElement.addEventListener('event', function() {
		genPW(outputElement);
	});
	loginElement.addEventListener('event', function() {
		genPW(outputElement);
	});
	masterPasswordElement.addEventListener('event', function() {
		genPW(outputElement);
	});

	// Get current tab URL
	const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
	const cleanURL = cleanUrl(tab.url,settings.urlFormatting)

	siteElement.value = cleanURL
	loginElement.value = settings.defaults.login || ""
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