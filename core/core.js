export class LPCore {
	constructor(charset, staticSecret, stripProtocol, stripSubdomain, stripPath, stripPort) {
		this.charset = charset;
		this.staticSecret = staticSecret;
	};

	async getPW(siteURL,login,masterPassword, passwordLength, passwordIndex,
				includeLowerCase, includeUpperCase, includeNumbers, includeSymbols) {

		// - Pre process inputs
		let charset

		if (!includeLowerCase || !includeUpperCase || !includeNumbers || !includeSymbols) {
			charset = modifyCharset(this.charset, includeLowerCase, includeUpperCase, includeNumbers, includeSymbols)
		} else {
			charset = this.charset
		}

		// - Generate the actual password
		let password = await _generatePassword(siteURL, login, masterPassword, passwordIndex, passwordLength, charset, this.staticSecret)

		// - And do some post processing (including ensuring that every category is represented)

		// TODO | gotta give some feedback in some way that this isnt possible with under 4 chars if all are enabled
		if (password.length >= 4) {
			password = ensureCharCategories(charset, password, includeLowerCase, includeUpperCase, includeNumbers, includeSymbols)
		}

		return password
	};

	getPassMojis(masterPassword) {
	if (masterPassword.length > 0) {
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

		const hash = masterPassword.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
		const emoji1 = emojis[hash % emojis.length];
		const emoji2 = emojis[(hash * 2) % emojis.length];
		const emoji3 = emojis[(hash * 3) % emojis.length];

		return [emoji1, emoji2, emoji3]
		}
	}
};

function modifyCharset(charset, includeLowerCase, includeUpperCase, includeNumbers, includeSymbols) {
	if (!includeLowerCase) {
		charset = charset.replace(/[a-z]/g, "");
	}

	if (!includeUpperCase) {
		charset = charset.replace(/[A-Z]/g, "");
	}

	if (!includeNumbers) {
		charset = charset.replace(/[0-9]/g, "");
	}

	if (!includeSymbols) {
		charset = charset.replace(/[^a-zA-Z0-9]/g, "");
	}

	return charset
};

export function filterURL(siteURL, urlFormatting) {
	console.log(siteURL, urlFormatting);

	// To avoid edge cases, remove trailing slashes
	while (siteURL.endsWith('/')) {
		siteURL = siteURL.slice(0, -1);
	}

	let partsToRemove = []

	if (urlFormatting.stripProtocol) {partsToRemove.push(siteURL.match(/^([a-zA-Z\d+\-.]*):\/\//)[0])}
	if (urlFormatting.stripSubdomain) {partsToRemove.push(siteURL.match(/([a-zA-Z0-9-]+\.)+(?=[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g))}
	if (urlFormatting.stripPort) {partsToRemove.push(siteURL.match(/:\d+/))}
	if (urlFormatting.stripPath) {
		let path = siteURL.match(/^(?:.+?:\/\/)?[^\/?#]+(\/(?!\/).*)$/)
		if (path != null) {
			partsToRemove.push(path[1])
		}
	}

	// remove all matches
	for (const match of partsToRemove) {
		if (match) {
			siteURL = siteURL.replace(match, '');
		}
	}
	return siteURL;
}

async function _generatePassword(siteURL,login,masterPassword,passwordIndex,passwordLength,charset,staticSecret) {
	// Technically something can go wrong with PBKDF2 afaik so ill just wrap it in a general try catch for now
	// try {
		// This function assumes that all the inputs are fine in terms of filters and what not
			const encoder = new TextEncoder();
			const userInputSalt = encoder.encode(siteURL + staticSecret + passwordIndex + login);

			const keyMaterial = await window.crypto.subtle.importKey(
				"raw", encoder.encode(masterPassword), { name: "PBKDF2" }, false, ["deriveBits"]
			);

			const derivedBits = await window.crypto.subtle.deriveBits(
				{ name: "PBKDF2", salt: userInputSalt, iterations: 300000, hash: "SHA-256" }, keyMaterial, passwordLength * 8
			);

			const hashArray = Array.from(new Uint8Array(derivedBits));

			return Array.from({ length: passwordLength }, (_, i) =>
					charset[(hashArray[i] + hashArray[(i + passwordLength) % hashArray.length]) % charset.length]
				).join('');

		// } catch (error) {
		// 	throw new Error(`Password generation failed: ${error.message} \n Please report this issue at https://github.com/Xeimyn/LesserPass`);
		// }
	}

function ensureCharCategories(charset, password, includeLowerCase, includeUpperCase, includeNumbers, includeSymbols) {
	let validatedRules = 0
	while (validatedRules < 4) {

		// Reset the count everytime we check the password
		validatedRules = 0

		// We get a list of chars used per category in the current password, so that we know what to replace later
		let usedLowerCase = password.match(/[a-z]/g)
		let usedUpperCase = password.match(/[A-Z]/g)
		let usedNumbers = password.match(/[0-9]/g)
		let usedSymbols = password.match(/[^a-zA-Z0-9]/g)

		// If lowers are enalbed BUT there are none used
		if (includeLowerCase && (!usedLowerCase || usedLowerCase.length === 0)) {
			// -> fill the password, with a lowercase char from charset by replacing one form the most used categories
			password = injectCharIntoPassword(password,charset.match(/[a-z]/g), usedUpperCase, usedNumbers, usedSymbols)
			// I could declare the rule as validated here but there could be an edge case where a later
			// rule screws over this rule again in some way so ill instead do 1 more run instead
		} else {
			validatedRules += 1
		}

		// Uppercase
		if (includeUpperCase && (!usedUpperCase || usedUpperCase.length === 0)) {
			// -> fill the password, with a CAPS from charset by replacing one form the most used categories (which is why we pass used*)
			password = injectCharIntoPassword(password,charset.match(/[A-Z]/g), usedLowerCase, usedNumbers, usedSymbols)
		} else {
			validatedRules += 1
		}

		// Numbers
		if (includeNumbers && (!usedNumbers || usedNumbers.length === 0)) {
			// -> fill the password, with a number from charset by replacing one form the most used categories
			password = injectCharIntoPassword(password,charset.match(/[0-9]/g), usedUpperCase, usedLowerCase, usedSymbols)
		} else {
			validatedRules += 1
		}

		// Symbols
		if (includeSymbols && (!usedSymbols || usedSymbols.length === 0)) {
			// -> fill the password, with a symbol from charset by replacing one form the most used categories
			password = injectCharIntoPassword(password,charset.match(/[^a-zA-Z0-9]/g), usedUpperCase, usedNumbers, usedLowerCase)
		} else {
			validatedRules += 1
		}
	}
	return password
}

function injectCharIntoPassword(password, charSubSet, ...usedCategories) {
	// Doing a bunch of stuff to make this replacement deterministic

	// seed based on the current password
	let seed = 0;
	for (let i = 0; i < password.length; i++) {
		seed = (seed * 31 + password.charCodeAt(i) + i) >>> 0;
	}

	// xorshift
	const deterRand = () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed;
	};

	// Find the category with the most used chars that also has at least 2 used chars
	let maxCategory = null;
	let maxCount = 1; // need at least 2 to be able to replace one
	for (const category of usedCategories) {
		if (category && category.length > maxCount) {
			maxCount = category.length;
			maxCategory = category;
		}
	}

	if (maxCategory) {
		// choose a deterministic element from the maxCategory
		const idxInCategory = deterRand() % maxCategory.length;
		const charToReplace = maxCategory[idxInCategory];

		// find all occurrences of that char in the password
		const occurrences = [];
		for (let i = 0; i < password.length; i++) {
			if (password[i] === charToReplace) occurrences.push(i);
		}

		if (occurrences.length > 0) {
			// pick a deterministic occurrence to replace
			const occIndex = deterRand() % occurrences.length;
			const charIndex = occurrences[occIndex];

			// pick a deterministic char to insert from availableChars
			const charToInsert = charSubSet[deterRand() % charSubSet.length];

			password = password.substring(0, charIndex) + charToInsert + password.substring(charIndex + 1);
		}
	}
	return password;
}