/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-luis
-----------------------------------------------------------------------------*/
const builder = require("botbuilder");
const botbuilder_azure = require("botbuilder-azure");
const path = require('path');

const useEmulator = (process.env.NODE_ENV == 'development');

const connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

const bot = new builder.UniversalBot(connector, { persistConversationData: true });
bot.localePath(path.join(__dirname, './locale'));
bot.use(builder.Middleware.sendTyping());

// Make sure you add code to validate these fields
const luisAppId = process.env.LuisAppId;
const luisAPIKey = process.env.LuisAPIKey;
const luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
const recognizer = new builder.LuisRecognizer(LuisModelUrl);
const intents = new builder.IntentDialog({recognizers: [recognizer]})
  .onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
  })
  .matches('FantasyPoints', '/fantasypoints');

bot.dialog('/', intents);
bot.dialog('/fantasypoints', [
  (session) => {
    session.send('So you want fantasy points?');
    session.endDialog();
  }
]);

if (useEmulator) {
    const restify = require('restify');
    const server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}
