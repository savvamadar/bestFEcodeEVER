var currentlyProcessing = {}; // {"result":null,"status":200,"callBackFunction":null,"finished":false}


var http_url_base = `${window.location.protocol}//shkalik.com/`;

function print(input){
	console.log(input);
}

function isPlainObject(variable) {
    return variable !== null && typeof variable === 'object' && Object.prototype.toString.call(variable) === '[object Object]';
}

let lastError_id = 0;

function unravelObj(objMsg){
	if(objMsg == null || objMsg == undefined){
		return [];
	}
	let msgList = [];
	if(Array.isArray(objMsg)){
		objMsg.forEach(message => {
			msgList = msgList.concat(unravelObj(message));
		});
	}
	else if(isPlainObject(objMsg)){
		for (let key in objMsg) {
			if (objMsg.hasOwnProperty(key)) { // Check if the property is own property
				msgList = msgList.concat(unravelObj(objMsg[key]));
			}
		}
	}
	else{
		msgList.push(objMsg);
	}

	//console.log(msgList);

	return msgList;
}

function displayErrorMessages(errorMsg) {
	lastError_id += 1;
	let localError_id = lastError_id;
    const container = document.getElementById('errorMessageContainer');
    container.innerHTML = '';
	
	let eMessage = errorMsg.message; 
	if (eMessage.indexOf("Error: ") == 0){
		eMessage = eMessage.substring(("Error: ").length);
	}
	
	if(eMessage in currentlyProcessing){
		eMessage = currentlyProcessing[eMessage]['json'];
	}

	let msgList = [];

	msgList = msgList.concat(unravelObj(eMessage));

	for(let i=0; i < msgList.length; i++){
		console.log(msgList[i]);
		if(msgList[i].toString().toLowerCase().includes('token') && msgList[i].toString().toLowerCase().includes('valid')){
			logout();
			location.reload();
			return;
		}

		let messageDiv = document.createElement('div');
		messageDiv.textContent = msgList[i].toString();
		container.appendChild(messageDiv);

	}

	container.style.display = 'block';

    setTimeout(() => {
		if(localError_id == lastError_id){
        	container.style.display = 'none'; // Hide after 3 seconds
		}
    }, 5000);
}

function fix_links(json_dict){
	if(json_dict === null){
		return null;
	}

	json_temp = JSON.stringify(json_dict);
	var_loc = '/var/www/html/';
	json_temp = json_temp.split(var_loc).join(window.location.origin+"/");

	return JSON.parse(json_temp);

}

function startRequest(requestUniqueID, requestType, url = null, token = null, data = null, callBackFunction=null){
	if(requestUniqueID in currentlyProcessing){
		console.error("requestUniqueID is not unique: "+requestUniqueID);
		return;
	}
	
	if(url == null){
		console.error("url is null");
		return;
	}
	
	if(requestType != "POST" && requestType != "PATCH" && requestType != "GET" && requestType != "DELETE"){
		console.error("requestType is bad: "+requestType);
		return;
	}
	
	url = http_url_base + url;

	console.log("RQ: "+url);
	
	headers = {};
	
	if(token != null){
		headers['Authorization'] = token; //Token ABCDEFG
	}
	
	currentlyProcessing[requestUniqueID] = {"json":null, "status":-1, "callBackFunction":callBackFunction, "finished":false, "id":requestUniqueID, "extra_args":[]};

	if (arguments.length > 6){
		for(let i=6; i < arguments.length; i++){
			currentlyProcessing[requestUniqueID]['extra_args'].push(arguments[i]);
		}
	}
	
	if(requestType == "GET"){
		getData(requestUniqueID, url, headers);
	}
	else if(requestType == "POST" || requestType == "PATCH"){
		if(data == null){
			data = {};
		}

		if(!(data instanceof FormData)){
			headers['Content-Type'] =  'application/json';
		}

		modifyData(requestUniqueID, url, requestType, headers, data);
	}
	else if(requestType == "DELETE"){
		deleteData(requestUniqueID, url, headers);
	}
	
}

function handleCallBack(res){
	if(res['extra_args'].length > 0){
		const extra_args = res['extra_args'];
		last_func = res["callBackFunction"];
		acculumalted_args = [res];
		for(let i=0; i < extra_args.length+1; i++){
			if(i == extra_args.length){
				last_func(...acculumalted_args);
				acculumalted_args = [res];
			}

			if (extra_args[i] instanceof Function) {
				last_func(...acculumalted_args);
				acculumalted_args = [res];
				last_func = extra_args[i];
			}
			else{
				acculumalted_args.push(extra_args[i]);
			}
		}

	}
	else{
		res["callBackFunction"](res);
	}
}

async function modifyData(requestUniqueID, url, type, headers, data) {
    try {
		send_args = {
            method: type,
            headers: headers,
			mode: 'cors',
			credentials: 'omit',
        };
		
		if(data !== null){
			if(data instanceof FormData){
				send_args['body'] = data;
			}
			else{
				send_args['body'] = JSON.stringify(data);
			}
		}
		
        const response = await fetch(url, send_args);
		
		try{
			currentlyProcessing[requestUniqueID]["json"] = await response.json();
			currentlyProcessing[requestUniqueID]["json"] = fix_links(currentlyProcessing[requestUniqueID]["json"]);
		}
		catch (error){
			currentlyProcessing[requestUniqueID]["json"] = {"_":[{"error":error}]};
		}
		
		currentlyProcessing[requestUniqueID]["status"] = response.status;
		currentlyProcessing[requestUniqueID]["finished"] = true;

        if (!response.ok) {
			if(currentlyProcessing[requestUniqueID]["finished"] == true){
				throw new Error(requestUniqueID);
			}
			else{
				throw new Error(`HTTP error: ${error}`);
			}
        }
    } catch (error) {
        displayErrorMessages(error);
    }
	
	if(requestUniqueID in currentlyProcessing){
		if(currentlyProcessing[requestUniqueID]["callBackFunction"] != null){
			res = currentlyProcessing[requestUniqueID];
			delete currentlyProcessing[requestUniqueID];
			handleCallBack(res);
		}
	}
}

async function getData(requestUniqueID, url, headers) {
    try {
		
		send_args = {
            method: "GET",
            headers: headers,
			mode: 'cors',
  			credentials: 'omit',
        };
	
		
        const response = await fetch(url, send_args);
		
		try{
			currentlyProcessing[requestUniqueID]["json"] = await response.json();
			currentlyProcessing[requestUniqueID]["json"] = fix_links(currentlyProcessing[requestUniqueID]["json"]);
		}
		catch (error){
			currentlyProcessing[requestUniqueID]["json"] = {"_":[{"error":error}]};
		}
		
		currentlyProcessing[requestUniqueID]["status"] = response.status;
		currentlyProcessing[requestUniqueID]["finished"] = true;
        
        if (!response.ok) {
            if(currentlyProcessing[requestUniqueID]["finished"] == true){
				throw new Error(requestUniqueID);
			}
			else{
				throw new Error(`HTTP error: ${error}`);
			}
        }
    } catch (error) {
        displayErrorMessages(error);
    }
	
	if(requestUniqueID in currentlyProcessing){
		if(currentlyProcessing[requestUniqueID]["callBackFunction"] != null){
			res = currentlyProcessing[requestUniqueID];
			delete currentlyProcessing[requestUniqueID];
			handleCallBack(res);
		}
	}
	
}

async function deleteData(requestUniqueID, url, headers) {
    try {
		
		send_args = {
            method: "DELETE",
            headers: headers,
			mode: 'cors',
			credentials: 'omit',
        };
		
        const response = await fetch(url, send_args);
		
		try{
			currentlyProcessing[requestUniqueID]["json"] = await response.json();
			currentlyProcessing[requestUniqueID]["json"] = fix_links(currentlyProcessing[requestUniqueID]["json"]);
		}
		catch (error){
			currentlyProcessing[requestUniqueID]["json"] = {"_":[{"error":error}]};
		}
		
		currentlyProcessing[requestUniqueID]["status"] = response.status;
		currentlyProcessing[requestUniqueID]["finished"] = true;

        if (!response.ok) {
            if(currentlyProcessing[requestUniqueID]["finished"] == true){
				throw new Error(requestUniqueID);
			}
			else{
				throw new Error(`HTTP error: ${error}`);
			}
        }
    } catch (error) {
        displayErrorMessages(error);
    }
	
	if(requestUniqueID in currentlyProcessing){
		if(currentlyProcessing[requestUniqueID]["callBackFunction"] != null){
			res = currentlyProcessing[requestUniqueID];
			delete currentlyProcessing[requestUniqueID];
			handleCallBack(res);
		}
	}
	
}