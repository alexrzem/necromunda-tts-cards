const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('node-html-parser');

const HTML_FILE = 'C:/Dev/work/rzemio/necromunda-tts-cards/assets/204937.html';
const html = fs.readFileSync(HTML_FILE, 'utf8');

const JSON_FILE = 'C:/Dev/work/rzemio/necromunda-tts-cards/assets/204937.json';
const json = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

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

let gangers = [];

const setGangerName = function (gangGangerCard, ganger) {
	let gangerLabel = gangGangerCard.querySelector('.gang-ganger-name');
	let gangerType = gangerLabel.querySelector('.ml-2');
	if (gangerType) {
		ganger.type = _.trim(gangerType.text);
		gangerType.remove();
	}

	ganger.name = _.trim(gangerLabel.text);
};

const setGangerCost = function (gangGangerCard, ganger) {
	let gangerCost = gangGangerCard.querySelector('.gang-ganger-cost');
	let costType = gangerCost.querySelector('div');
	if (costType) {
		ganger.cost.type = _.trim(costType.text);
		costType.remove();
	}

	ganger.cost.value = _.toNumber(_.trim(gangerCost.text));
};

const setGangerStats = function (gangGangerCard, ganger) {
	let _ganger = _.find(json.gang.gangers, function (item) {
		return _.eq(item.name, ganger.name) && _.eq(item.type, ganger.type);
	});

	if (_ganger) {
		ganger.stats = _.pick(_ganger, ['m', 'ws', 'bs', 's', 't', 'w', 'i', 'a', 'ld', 'cl', 'wil', 'int']);
	} else {
		ganger.stats = {};
	}
};

const setGangerWeapons = function (gangGangerCard, ganger) {
	let rows = gangGangerCard.querySelectorAll('table.gang-ganger-weapons tr');
	if (rows) {
		_.forEach(rows, function (row) {
			let weaponTitle = row.querySelector('td.gang-ganger-weapon-title');
			if (weaponTitle) {
				let weapon = {
					name: '',
					range: { s: '', l: '' },
					bonus: { s: '', l: '' },
					str: '',
					d: '',
					ap: '',
					am: '',
					traits: '',
				};

				let cells = row.querySelectorAll('td');
				_.forEach(cells, function (cell, index) {
					switch (index) {
						case 0:
							weapon.name = _.trim(cell.text);
							break;
						case 1:
							weapon.range.s = _.trim(cell.text);
							break;
						case 2:
							weapon.range.l = _.trim(cell.text);
							break;
						case 3:
							weapon.bonus.s = _.trim(cell.text);
							break;
						case 4:
							weapon.bonus.l = _.trim(cell.text);
							break;
						case 5:
							weapon.str = _.trim(cell.text);
							break;
						case 6:
							weapon.d = _.trim(cell.text);
							break;
						case 7:
							weapon.ap = _.trim(cell.text);
							break;
						case 8:
							weapon.am = _.trim(cell.text);
							break;
						case 9:
							weapon.traits = _.trim(cell.text);
							break;
						default:
							break;
					}
				});
				ganger.weapons.push(weapon);
			}
		});
	}
};

const setGangerWargearSkills = function (gangGangerCard, ganger) {
	let tables = gangGangerCard.querySelectorAll('table');
	if (tables) {
		_.forEach(tables, function (table) {
			if (!table.classList.contains('gang-ganger-stats') && !table.classList.contains('gang-ganger-weapons') && !table.classList.contains('table-striped')) {
				let rows = table.querySelectorAll('tr');
				_.forEach(rows, function (row) {
					if (row) {
						let cells = row.querySelectorAll('td');
						if (_.eq(_.trim(cells[0].text), 'WARGEAR')) {
							ganger.wargear = _.split(_.trim(cells[1].text), ',');
							_.remove(ganger.wargear, (item) => {
								return _.isEmpty(item);
							});
						}
						if (_.eq(_.trim(cells[0].text), 'SKILLS')) {
							ganger.skills = _.split(_.trim(cells[1].text), ',');
							_.remove(ganger.skills, (item) => {
								return _.isEmpty(item);
							});
						}
					}
				});
			}
		});
	}
};

let gangGangerCards = root.querySelectorAll('.gang-ganger-card');
_.forEach(gangGangerCards, function (gangGangerCard) {
	let ganger = {
		name: '',
		type: '',
		cost: { value: 0, type: '' },
		stats: { m: 0, ws: 0, bs: 0, s: 0, t: 0, w: 0, i: 0, a: 0, ld: 0, cl: 0, wil: 0, int: 0 },
		weapons: [],
		wargear: [],
		skills: [],
	};

	setGangerName(gangGangerCard, ganger);
	setGangerCost(gangGangerCard, ganger);
	setGangerStats(gangGangerCard, ganger);
	setGangerWeapons(gangGangerCard, ganger);
	setGangerWargearSkills(gangGangerCard, ganger);

	gangers.push(ganger);
});

fs.writeFileSync('C:/Dev/work/rzemio/necromunda-tts-cards/assets/concat.json', JSON.stringify(gangers, null, '  '));
console.log(JSON.stringify(gangers, null, '  '));
