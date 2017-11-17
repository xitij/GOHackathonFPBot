/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add
natural language support to a bot.
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-luis
-----------------------------------------------------------------------------*/
const builder = require("botbuilder");
const botbuilder_azure = require("botbuilder-azure");
const builder_cognitiveservices = require("botbuilder-cognitiveservices");
const rp = require('request-promise');
const path = require('path');
const api = require('./gameon-api');
const FAQ_URL = `https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/e97f03bb-65cc-4e2e-9cf8-396435335ba9/generateAnswer`;

const useEmulator = (process.env.NODE_ENV == 'development');

const connector = useEmulator ? new builder.ChatConnector({
  appId: process.env.MSAPP_ID,
  appPassword: process.env.MSAPP_PASSWORD
}) : new botbuilder_azure.BotServiceConnector({
  appId: process.env['MicrosoftAppId'],
  appPassword: process.env['MicrosoftAppPassword'],
  stateEndpoint: process.env['BotStateEndpoint'],
  openIdMetadata: process.env['BotOpenIdMetadata']
});

// Make sure you add code to validate these fields
const luisAppId = process.env.LuisAppId;
const luisAPIKey = process.env.LuisAPIKey;
const luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// GameOn API
api.getPlayers().then((NFLPlayers) => {

  const aggregateStats = (stats) => {
    const fantasyStats = {
      passing_yards: 0,
      passing_tds: 0,
      interceptions: 0,
      rushing_yards: 0,
      rushing_tds: 0,
      receiving_yards: 0,
      receiving_tds: 0,
      receptions: 0,
      fumbles: 0
    };
    stats.forEach(stat => {
      if (stat.game && stat.game.season !== 'PRE' && stat.game.season !== 'POST') {
        fantasyStats.passing_yards += (parseInt(stat.passing_yards) || 0);
        fantasyStats.passing_tds += (parseInt(stat.passing_tds) || 0);
        fantasyStats.interceptions += (parseInt(stat.interceptions) || 0);
        fantasyStats.rushing_yards += (parseInt(stat.rushing_yards) || 0);
        fantasyStats.rushing_tds += (parseInt(stat.rushing_tds) || 0);
        fantasyStats.receiving_yards += (parseInt(stat.receiving_yards) || 0);
        fantasyStats.receiving_tds += (parseInt(stat.receiving_tds) || 0);
        fantasyStats.receptions += (parseInt(stat.receptions) || 0);
        fantasyStats.fumbles += (parseInt(stat.fumbles) || 0);
      }
    });
    return fantasyStats;
  };

  const calculateFantasyPoints = (fantasyStats) => {
    const passingPoints = fantasyStats.passing_yards * .04 + fantasyStats.passing_tds * 4 - 2 * fantasyStats.interceptions;
    const rushingPoints = fantasyStats.rushing_yards * .1 + fantasyStats.rushing_tds * 6 - 2 * fantasyStats.fumbles;
    const receivingPoints = fantasyStats.receiving_yards * .1 + fantasyStats.receiving_tds * 6 + fantasyStats.receptions;
    return (passingPoints + rushingPoints + receivingPoints).toFixed(1);
  };

  const bot = new builder.UniversalBot(connector, {persistConversationData: true});
  bot.localePath(path.join(__dirname, './locale'));
  bot.use(builder.Middleware.sendTyping());

  // QA Recognizer
  const QARecognizer = new builder_cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: 'e97f03bb-65cc-4e2e-9cf8-396435335ba9',
    subscriptionKey: '595cc3ee0fc44e779975c7e60fc688d0'
  });

  const basicQnAMakerDialog = new builder_cognitiveservices.QnAMakerDialog({
    recognizers: [QARecognizer],
    defaultMessage: `Sorry I couldn't find a match! Try another question!`,
    qnaThreshold: 0.3
  });

  // Main dialog with LUIS
  const recognizer = new builder.LuisRecognizer(LuisModelUrl);
  const intents = new builder.IntentDialog({recognizers: [recognizer]})
    .onDefault((session) => {
      session.send(`I'm a simple fantasy bot. All I know is crunching fantasy points. Ask me for fantasy points`);
    })
    .matches('FantasyPoints', '/fantasypoints')
    .matches('FAQs', '/faqs');

  bot.dialog('/', intents);
  bot.dialog('/fantasypoints', [
    (session) => {
      session.send('So you want fantasy points? I gots that.');
      builder.Prompts.text(session, `Which player do you want fantasy points for?`);
    },
    (session, args, next) => {
      session.send(`You selected ${args.response}`);
      const selectedPlayer = NFLPlayers[args.response.toLowerCase()];
      if (selectedPlayer) {
        const params = {
          year: '2017'
        };
        return api.getPlayerStats({ params, playerId: selectedPlayer.id }).then(stats => {
          const totalStats = aggregateStats(stats);
          const fantasyPoints = calculateFantasyPoints(totalStats);
          session.send(`${selectedPlayer.name} has scored ${fantasyPoints} fantasy points thus far this season`);
          if (fantasyPoints / 10 > 8) {
            session.endDialog(`${selectedPlayer.name} is a huge boss`);
          } else if (fantasyPoints / 10  > 5) {
            session.endDialog(`${selectedPlayer.name} has been aight.`);
          } else {
            session.endDialog(`${selectedPlayer.name} has been kinda weak.`);
          }
        });
      } else {
        session.endDialog(`Unable to find player ${args.response}, sorry bud.`);
      }
    }
  ]);
  bot.dialog('/faqs', [
    (session) => {
      builder.Prompts.text(session, `I can answer some FAQs, hit me with it...`);
    },
    (session, args) => {
      const question = args.response;
      session.replaceDialog('/QABot', { question });
    }
  ]);
  bot.dialog('/QABot', basicQnAMakerDialog);
});

if (useEmulator) {
  const restify = require('restify');
  const server = restify.createServer();
  server.listen(3978, function () {
    console.log('test bot endpont at http://localhost:3978/api/messages');
  });
  server.post('/api/messages', connector.listen());
} else {
  module.exports = {default: connector.listen()}
}
