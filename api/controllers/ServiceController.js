/**
 * ServiceController
 *
 * @description :: Server-side logic for managing services
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	getService: function(req, res) {
		request = require('request-json');
		var client = request.createClient('http://www.transantiago.cl/');
		service = '301';
		direction = 1;

		client.get('restservice/rest/getrecorrido/'+service)
			.then(function(response) {
				stops = [];
	    	async.each(response.body[direction].paradas, function(stop, callback) {
					client.get('predictor/prediccion?codser='+service+'&codsimt='+stop.cod)
					.then(function(response) {
				    stops.push(response.body);
				    callback();
					});
				}, function(err) {
					response = _.map(response.body[direction].paradas, function(stop){
						stop.prediction = _.findWhere(stops, {paradero: stop.cod}).servicios.item[0];
						delete stop.servicios
						return stop;
					});
		    	return res.json(response);
				});
		});

  },

};

