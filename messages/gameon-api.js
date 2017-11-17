const rp = require('request-promise');
const Promise = require('bluebird');

const GAMEON_URL = `https://sam.gameontechnology.com/v1/`;

const request = (options) => {
  options.uri = GAMEON_URL + options.path;
  options.json = true;
  return rp(options).then(res => res.data);
};

const get = (options) => {
  options.method = 'GET';
  return request(options);
};

function getTeams() {
  return get({
    path: `/competitions/bdde04a5-14b6-414e-866f-69a39db52ebe/teams`
  });
}

function getPlayers(team) {
  return get({
    path: `/teams/${team.id}/players`,
  });
}

function getPlayerStats(options) {
  return get({
    path: `/players/${options.playerId}/gamestats`,
    qs: options.params,
    qsStringifyOptions: {
      encode: false
    }
  })
}

function fetchPlayers() {
  return getTeams().then((teams) => {
    const NFLPlayers = {};
    return Promise.map(teams, (team) => {
      return getPlayers(team).then(teamPlayers => {
        teamPlayers.forEach(player => {
          NFLPlayers[player.name.toLowerCase()] = player;
        });
      }).catch(err => {
        console.log(`Error getting Players`);
      });
    }).then((data) => {
      console.log(`Finished getting NFL players`);
      return NFLPlayers;
    });
  }).catch(err => {
    console.log(`err: ${err}`);
    console.log(`Error getting teams`);
  });
}

module.exports = {
  getPlayers: fetchPlayers,
  getPlayerStats
};