'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const axios = require('cachios');
const xml = require('xml');
const { parse } = require('node-html-parser');
const { convert, convertFile } = require('convert-svg-to-png');
const { resolveConfigFile } = require('prettier');

const IMAGE_FILE = 'C:/Dev/work/rzemio/necromunda-tts-cards/assets/ganger-card.txt';
const image = fs.readFileSync(IMAGE_FILE, 'utf8');

const getGangerName = function (gangGangerCard) {
	let gangerLabel = gangGangerCard.querySelector('.gang-ganger-name');
	let gangerType = gangerLabel.querySelector('small');

	let result = {
		name: '',
		type: '',
	};

	if (gangerType) {
		result.type = _.trim(gangerType.text);
		gangerType.remove();
	}

	result.name = _.trim(gangerLabel.text);

	return result;
};

const getGangerCost = function (gangGangerCard) {
	let gangerCost = gangGangerCard.querySelector('.gang-ganger-cost');
	let costType = gangerCost.querySelector('div');

	let result = {
		costValue: '',
		costType: '',
	};

	if (costType) {
		result.costType = _.trim(costType.text);
		costType.remove();
	}

	result.costValue = _.toNumber(_.trim(gangerCost.text));

	return result;
};

const getGangerStats = function (json, ganger) {
	let _ganger = _.find(json.gang.gangers, function (item) {
		return _.eq(item.name, ganger.name); // && _.eq(item.type, ganger.type);
	});

	return _.pick(_ganger, ['m', 'ws', 'bs', 's', 't', 'w', 'i', 'a', 'ld', 'cl', 'wil', 'int', 'xp', 'kills', 'advance_count', 'status']);
};

const getGangerWeapons = function (gangGangerCard, ganger) {
	let result = {};

	let rows = gangGangerCard.querySelectorAll('table.gang-ganger-weapons tr');
	if (rows) {
		_.forEach(rows, function (row, weaponIndex) {
			let weaponTitle = row.querySelector('td.gang-ganger-weapon-title');
			if (weaponTitle) {
				_.set(result, `weapon${weaponIndex}Name`, 'name');

				/*
				let weapon = {
					name: '',
					rng: { s: '', l: '' },
					acc: { s: '', l: '' },
					str: '',
					d: '',
					ap: '',
					am: '',
					traits: '',
				};
				*/

				let cells = row.querySelectorAll('td');
				_.forEach(cells, function (cell, index) {
					switch (index) {
						case 0:
							//weapon.name = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}Name`, _.trim(cell.text));
							break;
						case 1:
							//weapon.rng.s = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}RngS`, _.trim(cell.text));
							break;
						case 2:
							//weapon.rng.l = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}RngL`, _.trim(cell.text));
							break;
						case 3:
							//weapon.acc.s = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}AccS`, _.trim(cell.text));
							break;
						case 4:
							//weapon.acc.l = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}AccL`, _.trim(cell.text));
							break;
						case 5:
							//weapon.str = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}Str`, _.trim(cell.text));
							break;
						case 6:
							//weapon.d = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}D`, _.trim(cell.text));
							break;
						case 7:
							//weapon.ap = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}Ap`, _.trim(cell.text));
							break;
						case 8:
							//weapon.am = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}Am`, _.trim(cell.text));
							break;
						case 9:
							//weapon.traits = _.trim(cell.text);
							_.set(result, `weapon${weaponIndex}Traits`, _.trim(cell.text));
							break;
						default:
							break;
					}
				});
			}
		});
	}

	return result;
};

const getGangerWargearSkills = function (gangGangerCard, ganger) {
	let result = {};

	let tables = gangGangerCard.querySelectorAll('table');
	if (tables) {
		_.forEach(tables, function (table) {
			if (!table.classList.contains('gang-ganger-stats') && !table.classList.contains('gang-ganger-weapons') && !table.classList.contains('table-striped')) {
				let rows = table.querySelectorAll('tr');
				_.forEach(rows, function (row) {
					if (row) {
						let cells = row.querySelectorAll('td');
						if (_.eq(_.trim(cells[0].text), 'WARGEAR')) {
							let wargear = _.split(_.trim(cells[1].text), ',');
							_.remove(wargear, (item) => {
								return _.isEmpty(item);
							});
							_.set(result, `wargear`, _.join(wargear));
						}
						if (_.eq(_.trim(cells[0].text), 'SKILLS')) {
							let skills = _.split(_.trim(cells[1].text), ',');
							_.remove(skills, (item) => {
								return _.isEmpty(item);
							});
							_.set(result, `skills`, _.join(skills));
						}
					}
				});
			}
		});
	}

	return result;
};

const cardsData = function (html, json) {
	const gangers = [];

	try {
		const root = parse(html, {
			lowerCaseTagName: false,
			comment: false,
			blockTextElements: {
				script: false,
				noscript: false,
				style: false,
				pre: true,
			},
		});

		let gangGangerCards = root.querySelectorAll('.gang-ganger-card');
		_.forEach(gangGangerCards, function (card, index) {
			let details = {};

			details = _.assign(details, getGangerName(card));
			details = _.assign(details, getGangerCost(card));
			details = _.assign(details, getGangerStats(json, details));
			details = _.assign(details, getGangerWeapons(card));
			details = _.assign(details, getGangerWargearSkills(card));

			gangers.push(details);
		});
	} catch (error) {
		console.log(error);
	}

	return gangers;
};

exports.getCardsData = async (ctx) => {
	const { gangId } = ctx.params;

	try {
		//const HTML_FILE = 'C:/Dev/work/rzemio/necromunda-tts-cards/assets/204937.html';
		//const html = fs.readFileSync(HTML_FILE, 'utf8');
		let html = await axios.get(`https://yaktribe.games/underhive/print/cards/${gangId}?i=0&r=0`, { ttl: 3000 });
		html = html.data;

		//const JSON_FILE = 'C:/Dev/work/rzemio/necromunda-tts-cards/assets/204937.json';
		//const json = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
		let json = await axios.get(`https://yaktribe.games/underhive/json/gang/${gangId}.json`, { ttl: 3000 });
		json = json.data;

		const fighters = cardsData(html, json);

		ctx.status = 200;
		ctx.body = {
			gang: {
				name: json.gang.gang_name,
				type: json.gang.gang_type,
				rating: _.toNumber(_.trim(json.gang.gang_rating)),
				campaign: json.gang.campaign,
				credits: _.toNumber(_.trim(json.gang.credits)),
				meat: _.toNumber(_.trim(json.gang.meat)),
				reputation: _.toNumber(_.trim(json.gang.reputation)),
				wealth: _.toNumber(_.trim(json.gang.wealth)),
				alignment: json.gang.alignment,
				allegiance: json.gang.allegiance,
				territories: _.join(json.gang.campaign_territories, '\n'),
				rackets: _.join(json.gang.campaign_rackets, '\n'),
				stash: _.join(json.gang.gang_stash, '\n'),
				gang_notes: json.gang.gang_notes,
			},
			fighters: fighters,
		};
	} catch (error) {
		console.log(error);
		ctx.status = 500;
		ctx.body = error;
	}
};
