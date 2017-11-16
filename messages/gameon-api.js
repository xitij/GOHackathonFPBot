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

function getPlayers() {
  return getTeams().then((teams) => {
    const NFLPlayers = {};
    return Promise.map(teams, (team) => {
      return get({
        path: `/teams/${team.id}/players`,
      }).then(teamPlayers => {
        teamPlayers.forEach(player => {
          NFLPlayers[player.name] = player;
        });
      }).catch(err => {
        console.log(`Error getting Players`);
      });
    }).then((data) => (NFLPlayers));
  }).catch(err => {
    console.log(`err: ${err}`);
    console.log(`Error getting teams`);
  });
}

function getPlayerStats(options) {

}

module.exports = {
  getPlayers
};