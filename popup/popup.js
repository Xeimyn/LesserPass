document.addEventListener("DOMContentLoaded", async () => {
	// --- Loading Settings and UI
	// const SETTINGS = await loadSettings()
	// 		console.log(SETTINGS)

	const SETTINGS = {
		urlFormatting: {
			stripProtocol: true,
			stripSubdomain: true,
			stripPort: true,
			stripPath: true,
		},
		defaultInputs: {
			defaultLogin: "",
			defaultLength: 16,
			defaultIndex: 1,
			charset: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*?-_.+"
		},
		uiSettings: {
			overlay:{
				enabled: true,
				duration: 1250
			},
			monochromeMojis: false,
			autoFocus: "None" // Default value for the select element
		},
		special: {
			genLogin: {
				enabled: true,
				settings: {
					// %s = site aka smth like google.com -> google
					// %d = domain aka smth like domain.dev
					// -> google@domain.dev
					template: "%s@%d",
					domain: "jcms.dev",
				},
			},
			autoFill: false,
		}
	};


	// load all elements first
	const EL_overlay = document.getElementById("copiedOverlay");
	const EL_site = document.getElementById("site");
	const EL_login = document.getElementById("login");
	const EL_masterpw = document.getElementById("masterpw");
	const EL_passMojiContainer = document.getElementsByClassName("passMojiContainer")[0];
	const EL_passMojis = document.getElementsByClassName("emoji");
	const EL_length = document.getElementById("LengthInput");
	const EL_index = document.getElementById("IndexInput");
	const EL_filterLowers = document.getElementById("filterLowers")
	const EL_filterCaps = document.getElementById("filterCaps")
	const EL_filterNumbers = document.getElementById("filterNumbers")
	const EL_filterSymbols = document.getElementById("filterSymbols")
	const EL_output = document.getElementById("output");
	const EL_toggleView = document.getElementById("toggleView");
	const EL_toggleViewImg = document.getElementById("toggleViewImage");

	// --- Fill UI with values

	// Get tab URL
	let url

	chrome.runtime.sendMessage({ action:"getOpenedViaButton"}, async (response) => {
	if (response[0] === true) {
		chrome.runtime.sendMessage({ action:"resetOpenedViaButton"});
		url = response[1]
	} else {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		url = tab.url
	}

	// Set url
	EL_site.value = cleanUrl(url, SETTINGS.urlFormatting.stripProtocol, SETTINGS.urlFormatting.stripSubdomain, SETTINGS.urlFormatting.stripPort, SETTINGS.urlFormatting.stripPath, );

	// Set login
	if (SETTINGS.special.genLogin.enabled) {
		// No matter the user settings loginGen requries a fully cleaned domain
		pureDomain = cleanUrl(url,true,true,true,true)
		generatedLogin = generateLogin( pureDomain, SETTINGS.special.genLogin.settings.template, SETTINGS.special.genLogin.settings.domain )
		EL_login.value = generatedLogin;
	} else {
		EL_login.value = SETTINGS.defaultInputs.defaultLogin;
	}
})

	// Index and length
	EL_length.value = SETTINGS.defaultInputs.defaultLength;
	EL_index.value = SETTINGS.defaultInputs.defaultIndex;

	// This is a "proxy" function that lets me pass arguments without passing them every time essentially
	// it is important that we pass the elements and not the values since its supposed to react to the changes value
	const triggerRegeneration = () => regeneratePassword(
		SETTINGS,
		EL_site,
		EL_login,
		EL_masterpw,
		EL_length,
		EL_index,
		EL_filterLowers,
		EL_filterCaps,
		EL_filterNumbers,
		EL_filterSymbols,
		EL_output,
		EL_passMojis
	);

	// --- Add eventlisteners to regenerate pw if needed

	// TODO | Add debounce shits so that it doesent lag behind
	// TODO | combine these all into a custom event dispatcher so that i have 1 place where it reads it and retrigs
	[EL_site, EL_login, EL_masterpw, EL_length, EL_index].forEach(element =>
		element.addEventListener("keyup", triggerRegeneration)
	);

	["minusLength", "plusLength", "minusIndex", "plusIndex","filterLowers","filterCaps","filterNumbers","filterSymbols"].forEach(id =>
		document.getElementById(id).addEventListener("click", triggerRegeneration)
	);

	// --- And finally make the UI parts work (Buttons changing value etc)


	// View / Hide master pw
	EL_passMojiContainer.addEventListener("click", () => {
		const isPassword = EL_masterpw.type === "password";
		EL_masterpw.type = isPassword ? "text" : "password";
	});

	// Make the custom number shit work
	const adjustValue = (element, delta) => {
		element.value = Math.max(1, (Number(element.value) || 1) + delta);
	};

	const adjustListeners = [
		["minusLength", () => adjustValue(EL_length, -1)],
		["plusLength", () => adjustValue(EL_length, 1)],
		["minusIndex", () => adjustValue(EL_index, -1)],
		["plusIndex", () => adjustValue(EL_index, 1)],
	];

	for (const [id, handler] of adjustListeners) {
		document.getElementById(id).addEventListener("click", handler);
	}


	// Let the user copy the output by pressing enter on the input (if password is at least 1 long)
	EL_masterpw.addEventListener("keydown",async (event) => {
		if (EL_masterpw.value.length >= 1 && event.key === "Enter") {

			if (SETTINGS.experimentalSettings.autoFill) {
				const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
				chrome.tabs.sendMessage(tab.id,{ action: "fillPassword", password: EL_output.value }, (response) => {
					if (response) {
						console.log("[LesserPass] Password filled in.");
					} else {
						copyToClipboard(EL_output.value, EL_overlay, SETTINGS);
					}
				})

			} else {
				copyToClipboard(EL_output.value,EL_overlay,SETTINGS);
			}
		}
	});

	// View / Hide output pw
	EL_toggleView.addEventListener("click", () => {
		const isPasswordType = EL_output.type === "password";
		EL_output.type = isPasswordType ? "text" : "password";
		EL_toggleViewImg.src = isPasswordType ? "../assets/icons/eye_blind.svg" : "../assets/icons/eye.svg";
	});

	// Click to copy
	EL_output.addEventListener("click", () => copyToClipboard(EL_output.value,EL_overlay,SETTINGS));

	// Let the user dismiss the overlay by clicking it
	EL_overlay.addEventListener("click", () => {
		EL_overlay.style.visibility = "hidden";
	});

	// loop through EL_passMojis and remove monoMoji class
	if (SETTINGS.uiSettings.monochromeMojis) {
		for (const mojiElement of EL_passMojis) {
			mojiElement.classList.remove("monoMoji");
		}
	}


	// fill in verion number
	let version = document.getElementById("version")
	version.innerText = "v" + chrome.runtime.getManifest().version

	// And finally, focus whatever element the user wants selected (if any)
	if (SETTINGS.uiSettings?.autoFocus) {
		const focusMap = {
			"Site": EL_site,
			"Login": EL_login,
			"MasterPW": EL_masterpw,
			"PWLength": EL_length,
			"PWIndex": EL_index,
		};
		focusMap[SETTINGS.uiSettings.autoFocus]?.focus();
	}
});

async function loadSettings() {
	const SETTINGS = chrome.storage.sync.get("LesserPassSettings");
	if (Object.keys(SETTINGS).length === 0) {
		// If the Settings are literally non existant, open the settings page...
		chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
		return;
	} else {
		return SETTINGS
	}
}

function cleanUrl(url, stripProtocol, stripSubdomain, stripPort, stripPath) {
	// To avoud edge cases, remove trailing slashes
	while (url.endsWith('/')) {
		url = url.slice(0, -1);
	}

	let partsToRemove = []


	if (stripProtocol) {partsToRemove.push(url.match(/^([a-zA-Z\d+\-.]*):\/\//)[0])}
	if (stripSubdomain) {partsToRemove.push(url.match(/([a-zA-Z0-9-]+\.)+(?=[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g))}
	if (stripPort) {partsToRemove.push(url.match(/:\d+/))}

	if (stripPath) {
		let path = url.match(/^(?:.+?:\/\/)?[^\/?#]+(\/(?!\/).*)$/)
		if (path != null) {
			partsToRemove.push(path[1])
		}
	}

	// remove all matches
	for (const match of partsToRemove) {
		if (match) {
			url = url.replace(match, '');
		}
	}
	return url;
}

function generateLogin(pureDomain,template,domain) {
	template = template.replace("%s", pureDomain.split(".")[0]);
	template = template.replace("%d", domain);
	return template
}

function showCopiedOverlay(copiedOverlayElement,ms) {
	copiedOverlayElement.style.visibility = "visible";
	setTimeout(() => copiedOverlayElement.style.visibility = "hidden", ms);
}


function copyToClipboard(text,copiedOverlayElement,SETTINGS) {
	navigator.clipboard.writeText(text).then(() => {
		if (SETTINGS.uiSettings.overlay.enabled) {
			showCopiedOverlay(copiedOverlayElement,SETTINGS.uiSettings.overlay.duration);
		}
		console.log('[LesserPass] Password copied to clipboard');
	})
}


async function genPW(site, login, masterPassword, length, index, chars) {
	const encoder = new TextEncoder();
	const salt = encoder.encode(site + login + index);

	// TODO | depending on the filters at least one of each should be in the final pw
	// lets do it the restarted way
	// once generated check if password has at least 1 x
	// if not, count the other groups and replace a random one out of the group that has the most and at least 2 ofc
	// repeat until its all good

	try {
		const keyMaterial = await window.crypto.subtle.importKey(
			"raw", encoder.encode(masterPassword), { name: "PBKDF2" }, false, ["deriveBits"]
		);

		const derivedBits = await window.crypto.subtle.deriveBits(
			{ name: "PBKDF2", salt, iterations: 300000, hash: "SHA-256" }, keyMaterial, 256
		);

		const hashArray = Array.from(new Uint8Array(derivedBits));
		return Array.from({ length }, (_, i) =>
			chars[(hashArray[i] + hashArray[(i + length) % hashArray.length]) % chars.length]
		).join('');
	} catch (error) {
		console.warn("[LesserPass] PBKDF2 failed.");
		return "";
	}
}

async function regeneratePassword(SETTINGS, siteElement, loginElement, masterPasswordElement, lengthElement, indexElement,filterLowersElement, filterCapsElement, filterNumbersElement, filterSymbolsElement, outputElement, emojiElements) {
	const site = siteElement.value;
	const login = loginElement.value;
	const masterPassword = masterPasswordElement.value;
	const length = Number(lengthElement.value);
	const index = Number(indexElement.value);
	let charset = SETTINGS.defaultInputs.charset;

	// Filtering
	if (!filterLowersElement.checked) {
		charset = charset.replace(/[a-z]/g, "");
	}

	if (!filterCapsElement.checked) {
		charset = charset.replace(/[A-Z]/g, "");
	}
	if (!filterNumbersElement.checked) {
		charset = charset.replace(/[0-9]/g, "");
	}
	if (!filterSymbolsElement.checked) {
		charset = charset.replace(/[^a-zA-Z0-9]/g, "");
	}

	if (site && login && masterPassword.length >= 1 && length >= 1 && index >= 1) {
		const password = await genPW(site, login, masterPassword, length, index, charset);
		updateEmojiPreview(masterPasswordElement, emojiElements);
		outputElement.value = password;
	} else {
		outputElement.value = "";
		updateEmojiPreview(masterPasswordElement, emojiElements);
	}
}

function updateEmojiPreview(masterPasswordElement, emojiElements) {
	if (masterPasswordElement.value.length > 0) {
		const emojis = [
			"🍒","🚽","🌊","🐶","👍","🐀","🌴","🍌",
			"🍏","🔒","🍓","🎓","🎉","🐐","🔥","✋",
			"🤡","🤛","🐈","🚁","🔆","🌜","🔑","🎻",
			"🚧","🏓","🎮","💜","💩","👽","👻","💀",
			"🐱‍👤","🦄","🐍","🐉","🦖","🐘","🦞","🦴",
			"🦷","👀","👅","🦾","🦿","🧠","✨","🎉",
			"💍","💎","🛒","🏆","🥇","🔊","🔧","📞",
			"💣","🔍","📌","🍗","🍇","🥕","🚲","🚀"
		];

		const hash = masterPasswordElement.value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
		const emoji1 = emojis[hash % emojis.length];
		const emoji2 = emojis[(hash * 2) % emojis.length];
		const emoji3 = emojis[(hash * 3) % emojis.length];

		emojiElements[0].innerText = emoji1;
		emojiElements[1].innerText = emoji2;
		emojiElements[2].innerText = emoji3;
	} else {
		emojiElements[0].innerText = "-";
		emojiElements[1].innerText = "-";
		emojiElements[2].innerText = "-";
	}
}
