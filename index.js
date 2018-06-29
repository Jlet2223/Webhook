'use strict';
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const TOKEN_PATH = 'credentials.json';
const secret = "client_secret.json"
var calendar = google.calendar('v3');


exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  
  function authorize(credentials, callback) {
	  const {client_secret, client_id, redirect_uris} = credentials.installed;
	  let token = {};
	  const oAuth2Client = new google.auth.OAuth2(
		  client_id, client_secret, redirect_uris[0]);

	  // Check if we have previously stored a token.
	  try {
		token = fs.readFileSync(TOKEN_PATH);
	  } catch (err) {
		return getAccessToken(oAuth2Client, callback);
	  }
	  oAuth2Client.setCredentials(JSON.parse(token));
	  callback(oAuth2Client);
	}


	function getAccessToken(oAuth2Client, callback) {
	  const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	  });
	  console.log('Authorize this app by visiting this url:', authUrl);
	  const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	  });
	  rl.question('Enter the code from that page here: ', (code) => {
		rl.close();
		oAuth2Client.getToken(code, (err, token) => {
		  if (err) return callback(err);
		  oAuth2Client.setCredentials(token);
		  // Store the token to disk for later program executions
		  try {
			fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
			console.log('Token stored to', TOKEN_PATH);
		  } catch (err) {
			console.error(err);
		  }
		  callback(oAuth2Client);
		});
	  });
	}

	function listEvents(auth) {
	  const calendar = google.calendar({version: 'v3', auth});
	  calendar.events.list({
		calendarId: 'primary',
		timeMin: (new Date()).toISOString(),
		maxResults: 10,
		singleEvents: true,
		orderBy: 'startTime',
	  }, (err, {data}) => {
		if (err) return console.log('The API returned an error: ' + err);
		const events = data.items;
		if (events.length) {
			let conv = agent.conv();
			events.map((event, i) => {
				const start = event.start.dateTime || event.start.date;
				console.log(`${start} - ${event.summary}`);
				conv.ask(`${start} - ${event.summary}`);
			});
			agent.add(conv);
		}else {
		  agent.add('No upcoming events found.');
		}
	  });
	}
	
	function createEvent(auth){
		const calendar = google.calendar({version: 'v3', auth});
		let date = agent.parameters.date;
		let summary = agent.parameters.any;
		var event = {
			'summary': '',
			'description': 'plans',
			'start': {
			},
			'end': {
			}
		};
		event.summary = summary;
		event.start.date = date;
		event.end.date = date;
		
		calendar.events.insert({
			auth: auth,
			calendarId: 'primary',
			resource: event,
		},function(err,event){
			if (err) return console.log('The API returned an error: ' + err);
			
		agent.add('Event Added');
		});
	}


  function action(agent,fun){
	try {
	  const content = fs.readFileSync('client_secret.json');
	  return authorize(JSON.parse(content), fun);
	} catch (err) {
	  return console.log('Error loading client secret file:', err);
	}
  }
 
  function welcome(agent) {
    agent.add('Welcome my friend');
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  function getcalendar(agent){
	action(agent,listEvents); 
  }
  
  function makeEvent(agent){
	  action(agent,createEvent);
  }
  
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Calendar', getcalendar);
  intentMap.set('Calendar-NewEvent', makeEvent);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});