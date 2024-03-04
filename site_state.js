var currentTokenFetch = '';

console.log("currentTokenFetch: "+currentTokenFetch);
console.log("sessionToken: "+('sessionToken' in sessionStorage ? sessionStorage['sessionToken'] : false));
console.log("sessionProfile: "+('sessionProfile' in sessionStorage ? sessionStorage['sessionProfile'] : false));
console.log("authToken: "+getCookieValue("authToken"));

let currentlyRefreshing = false;

if ((!('sessionToken' in sessionStorage)) || sessionStorage['sessionToken'] == null || sessionStorage['sessionToken'] == ''){
	let attemptedValue = getToken();
	let invalidValue = (attemptedValue == null || attemptedValue == '' || attemptedValue.indexOf("Token ") != 0);
	if(!invalidValue){
		currentlyRefreshing = true;
		refreshToken(attemptedValue);
	}
	else{
		currentlyRefreshing = false;
		logout();
	}
}
else if((!('sessionProfile' in sessionStorage)) || sessionStorage['sessionProfile'] == null || sessionStorage['sessionProfile'] == '' || sessionStorage['sessionProfile'] == '{}'){
	currentlyRefreshing = true;
	forceUpdateSelfProfile(getToken());
}

function beautify_UTC(utcTimeString, include_time = true){
	//const utcTimeString = "2024-02-03T20:47:48.312743Z";

	let date = new Date(utcTimeString);

	let prettyDate = date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		weekday: 'long',
	});

	let prettyTime = date.toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
	});

	if(include_time){
		return `${prettyTime} on ${prettyDate}`;
	}
	else{
		return `${prettyDate}`;
	}
}

function logout(){
	sessionStorage['sessionProfile'] = JSON.stringify({});
	sessionStorage['sessionToken'] = '';
	document.cookie = "authToken=; path=/; max-age=0; SameSite=Strict";
	currentTokenFetch = '';
}

function getToken(){
	let attemptedValue = null;
	
	if('sessionToken' in sessionStorage){
		attemptedValue = sessionStorage['sessionToken'];
	}

	let invalidValue = (attemptedValue == null || attemptedValue == '' || attemptedValue.indexOf("Token ") != 0);

	attemptedValue = invalidValue ? getCookieValue("authToken") : attemptedValue;

	invalidValue = (attemptedValue == null || attemptedValue == '' || attemptedValue.indexOf("Token ") != 0);


	if(invalidValue){
		return null;
	}
	else{
		sessionStorage['sessionToken'] = attemptedValue;
		return attemptedValue;
	}
}

function quickIsAuthed(){
	return ('sessionToken' in sessionStorage) && ('sessionProfile' in sessionStorage) && sessionStorage['sessionToken'] != null && sessionStorage['sessionToken'] != '' && sessionStorage['sessionProfile'] != null && sessionStorage['sessionProfile'] != '' && sessionStorage['sessionProfile'] != '{}';
}

function quickIsAdmin(){
	if(quickIsAuthed()){
		if("admin" in JSON.parse(sessionStorage['sessionProfile'])){
			return JSON.parse(sessionStorage['sessionProfile'])['admin'];
		}
	}
	return false;
}

async function isAuthed(){
	let maxTime = 3000;
	while (currentlyRefreshing && maxTime > 0) {
		maxTime -= 50;
		await new Promise(resolve => setTimeout(resolve, 50)); // waits for 100ms
	}

	currentlyRefreshing = false;
	if(maxTime <= 0){
		return false;
	}

	return quickIsAuthed();
}

function getCookieValue(cookieName) {
    // Split document.cookie on semicolons into an array
    const cookieArray = document.cookie.split(';');
  
    // Loop through the array elements
    for(let cookie of cookieArray) {
        // Trim leading whitespace
        const cookiePair = cookie.trim().split('=');
        
        // Decode the cookie's name and compare it to the given name
        if (cookiePair[0] === cookieName) {
            // If found, decode the cookie's value and return it
            return decodeURIComponent(cookiePair[1]);
        }
    }
  
    // Return null if the cookie was not found
    return null;
}

function selfProfileRequest(res, callBackFunction = null){
	console.log("currentlyRefreshing4");
	currentlyRefreshing = false;
	if(res['status'] == 200){
		if(currentTokenFetch == res['id']){
			sessionStorage['sessionToken'] = currentTokenFetch;
			sessionStorage['sessionProfile'] = JSON.stringify(res['json']);

			document.cookie = "authToken="+currentTokenFetch+"; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT; SameSite=Strict";

			currentTokenFetch = '';
			if(callBackFunction != null){
				callBackFunction();
			}
		}
	}
	else{
		if(currentTokenFetch == res['id']){
			logout();
			if(callBackFunction != null){
				callBackFunction();
			}
		}
	}
}

function adminNavInject(){

	let injectAdminNav = false;

	isAuthed().then(isAuthenticated => {
		if (isAuthenticated) {
			injectAdminNav = quickIsAdmin();
		}

		if(injectAdminNav){
			let navBar = document.getElementById("nav-bar");
			if(navBar){
				let navBarAdmin = document.getElementById("nav-bar-admin");
				if(!navBarAdmin){
					navBar.innerHTML += `<li><a href="admin.html" style="color:#248afd;" id="nav-bar-admin">Admin</a></li>`;
				}
			}
		}

	}).catch(error => {
		console.log(error);
	});
}



function forceUpdateSelfProfile(token, callBackOptional=null){
	if(token == null){
		currentlyRefreshing = false;
		logout();
		if(callBackOptional != null){
			callBackOptional();
		}
		return;
	}
	if(callBackOptional != null){
		startRequest(token, "GET", url = 'api/profile/me/', token = token, data = null, callBackFunction=selfProfileRequest, callBackOptional);
	}
	else{
		startRequest(token, "GET", url = 'api/profile/me/', token = token, data = null, callBackFunction=selfProfileRequest);
	}
}

function refreshToken(token, callBackFunction=null){

	currentlyRefreshing = true;

	let new_token = token;

	if(new_token.indexOf("Token ") != 0){
		new_token = "Token "+token;
	}

	new_token = new_token.trim();
	
	currentTokenFetch = new_token;

	console.log("Refreshing Token");

	forceUpdateSelfProfile(new_token, callBackFunction = callBackFunction);
	
}