const stripSubdomain = document.getElementsByName("stripSubDomain")[0];
const stripPath = document.getElementsByName("stripPath")[0];
const stripProtocol = document.getElementsByName("stripProtocol")[0];

const defaultLogin =  document.getElementsByName("login")[0];
const defaultLength =  document.getElementsByName("length")[0];
const defaultIndex =  document.getElementsByName("index")[0];

const autofill = document.getElementsByName("autofill")[0];
const copiedOverlay = document.getElementsByName("copiedOverlay")[0];

const focus = document.getElementsByName("focus")[0];

const charset = document.getElementsByName("charset")[0];

[stripSubdomain,stripPath,stripProtocol,defaultLogin,defaultLength,defaultIndex,autofill,copiedOverlay,focus,charset].forEach(function(element) {
	element.addEventListener("change", async function() {
		console.log(
			{
				"urlFormatting": {
					"stripSubDomain": stripSubdomain.value,
					"stripPath"     : stripPath.value,
					"stripProtocol" : stripProtocol.value
				},
				"defaultInput":{
					"login"   : defaultLogin.value,
					"length"  : defaultLength.value,
					"index"   : defaultIndex.value,
				},
				"misc": {
					"autofill": autofill.value,
					"copiedOverlay": copiedOverlay.value,
					"focus": focus.value, // [site,login,masterpw,length,index,null]
					"charset" : charset.value,
				}
			}
		)
	});
 });
