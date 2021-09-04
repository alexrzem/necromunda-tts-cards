'use strict';

const controller = require('./gang.controller');

module.exports = Router => {
	const router = new Router({
		prefix: `/gang`,
	});

	router
		.get('/:gangId', controller.getCardsData)
		//.get('/:gangId/:gangerId', controller.getCard)
		//.get('/', controller.getAll)

	return router;
};
