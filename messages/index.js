/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var weatherUtil = require("./Alexa Weather Library/weatherUtil");
var sprintf = require("sprintf-js").sprintf;  

var city;
var state;
var date;
var weatherKey = "43e6421946604070";
var test = false;
var testTrain = false;  // For use when formally testing Bot Framework

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'api.projectoxford.ai';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.matches('forecast_all', [getEntities,
    function (session, args, next) {
        session.userData.intent = "Weather";  // Save intent so user doesn't have to retype it
        weatherUtil.makeWeatherRequest(weatherKey, session.userData.intent, session.userData.city, session.userData.state, session.userData.date, test,
            function (result) {
                session.send("> " + result.tell + "\n");
            });

 }])
.matches('small talk greeting', 
    function (session, args) {
    session.send("> " + "Hello.  I am Sonny the weather bot.  How may I help you?");
})
.matches('small talk farewell', 
    function (session, args, next) {
    // This is farewell so we'll end the dialog with a farewell message
    session.send("> " + "Goodbye.  It was my pleasure to serve you."); 
})
.matches('None', (session, args) => {
    session.send('Hi! This is the None intent handler. You said: \'%s\'.', session.message.text);
})
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog('/', intents);    

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}

bot.dialog("/getEntities", [
    function getEntities(session, args, next) {
        var sprintf = require("sprintf-js").sprintf;
        args = session.userData.args;
        if (testTrain) {
            console.log("\tThe intent is '%s' with a score of %s", args.intents[0].intent, args.intents[0].score);
            console.log("\tThere are %s entities.", args.entities.length);
            for (var i = 0; i < args.entities.length; i++) {
                if (args.entities[i].type == 'datetime.date') {
                    var resDate = args.entities[i].resolution.date ? args.entities[i].resolution.date : "NO_DATE";
                    var resTime = args.entities[i].resolution.time ? args.entities[i].resolution.time : "NO_TIME";
                    console.log("\tEntity %s is of type '%s' with value '%s' and resolution date '%s' and resolution time '%s'", i, args.entities[i].type, args.entities[i].entity, resDate, resTime);
                } else {
                    if (args.entities[i].type == 'datetime.time') {
                        var resDate = args.entities[i].resolution.date ? args.entities[i].resolution.date : "NO_DATE";
                        var resTime = args.entities[i].resolution.time ? args.entities[i].resolution.time : "NO_TIME";
                        console.log("\tEntity %s is of type '%s' with value '%s' and resolution date '%s' and resolution time '%s'", i, args.entities[i].type, args.entities[i].entity, resDate, resTime);
                    } else {
                        console.log("\tEntity %s is of type '%s' with value '%s'", i, args.entities[i].type, args.entities[i].entity);
                    }
                }
            }
        }

        // This is used to decide if a message was a valid weather request or not
        session.userData.entityCount = 0;
        // Resolve and store any entities passed from LUIS.
        city = builder.EntityRecognizer.findEntity(args.entities, "geography.city");
        if (!city) {
            // Nothing of entity type geography.city.  Try entity_location.
            city = builder.EntityRecognizer.findEntity(args.entities, "entity_location");
        }
        state = builder.EntityRecognizer.findEntity(args.entities, "geography.us_state");
        date = builder.EntityRecognizer.findEntity(args.entities, "datetime.date");
        var entity;
        // Did LUIS find a city? 
        if (!city) {
            if (state) {
                // LUIS found a state, but not a city, so ask for city later
            } else {
            // No.  Check to see if we have an existing city.
            entity = session.userData.city;
            if (entity) {
                // city was given previously  
                city = entity;
                // If using previous city, use previous state
                state = session.userData.state;
            }
            }
        } else {
            // Grab the city from the entity object returned by LUIS
            city = toProperCase(city.entity);
            session.userData.entityCount += 1;
        }

        if (state) {
            if (typeof state === 'object') {
                // state object passed in my by LUIS
                state = toProperCase(state.entity);
                session.userData.entityCount += 1;
            }
        }

        // Did LUIS find a date? 
        if (!date) {
            // No.  Check to see if we have an existing date.
            entity = session.userData.date;
            if (entity) {
                // city was given previously  
                date = entity;
            } else {
                // If no date provided, and no date previously provided, use today
                var d = new Date();

                // Node getMonth() is 0-based while getDate() is 1-based
                date = sprintf("%s-%s-%s", d.getFullYear(), pad(d.getMonth() + 1), pad(d.getUTCDate()));
               // if (test) console.log("Today is %s.", date);
            }
        } else {
            // Grab the city from the entity object returned by LUIS
            date = date.resolution.date;
            if (date.search("XXXX") === 0) {
                // Bot Framework returned a date of XXXX-WXX-d where d is the day of the week.  Get date of next occurrance of that day.
                var d = new Date();
                var d2 = new Date();
                var lastDash = date.lastIndexOf("-");
                var day = date.substr(lastDash+1);
                var diff = count(day);
                d2.setDate(d.getDate() + diff);
                date = sprintf("%s-%s-%s", d2.getFullYear(), pad(d2.getMonth() + 1), pad(d2.getUTCDate()));
            }
            session.userData.entityCount += 1;
        }

        // Prompt the user to pick a city if they didn't specify a valid one.
        if (!city) {
            if (state) {
               builder.Prompts.text(session, "> Which city in " + state + " are you interested in?"); 
            } else {
                builder.Prompts.text(session, "> Which city are you interested in?");
            }
        } else {
            next({ response: city });
        }
    },
    function haveCity(session, results) {
        session.userData.city = toProperCase(results.response);
        session.beginDialog("/askState");
    }
]);

bot.dialog("/askState", [
    function askState(session, args, next){
        if (!state) {
            builder.Prompts.text(session, "> Which state is " + session.userData.city + " located in?");
        } else {
            next({response: state});
        }
    },
    function haveState (session, results){
        session.userData.state = results.response;
        session.beginDialog("/askDate");
    }    
]);

bot.dialog("/askDate", [
    function askDate(session, args, next){
        if (!date){
            builder.Prompts.text(session, "> For which date? (xxxx-yy-dd) or 'today'");
        } else {
            next({response: date});
        }       
    },
    function haveDate(session, results){
        var date = results.response;
        // Should do some validation
        
        if (date.toLowerCase() === "today"){
            date = today(); //"current";
        };
    
        session.userData.date = date;
        session.endDialog();
    } 
]);

function toProperCase(city) {
    return city.replace(/\w*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

function pad(n) {
    return (n < 10) ? ("0" + n) : n;
}

function abs(value) {
    return(value>0 ? value : -value);
}

function count(day){
    var today = (new Date()).getDay();
    var diff = day - today;
    return diff ? diff : 7 + diff;
}


