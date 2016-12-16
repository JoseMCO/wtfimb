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
		service = req.param('service') || 'H09';
		direction = 1;

		function getDistance(lat1, lon1, lat2, lon2) {
			var p = 0.017453292519943295;    // Math.PI / 180
			var c = Math.cos;
			var a = 0.5 - c((lat2 - lat1) * p)/2 + 
			        c(lat1 * p) * c(lat2 * p) * 
			        (1 - c((lon2 - lon1) * p))/2;

			return 1000 * 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
		}

		client.get('restservice/rest/getrecorrido/'+service)
			.then(function(response) {
				var stopsInfo = [];
				var line = [];
	    	async.each(response.body[direction].paradas, function(stop, callback) {
					client.get('predictor/prediccion?codser='+service+'&codsimt='+stop.cod)
						.then(function(res) {
					    stopsInfo.push(res.body);
					    callback();
						}
					);
				}, function(err) {
					var latlong = null;
					var totoalDistance = 0;
					var stops = _.map(response.body[direction].paradas, function(stop){
						stop.prediction = _.findWhere(stopsInfo, {paradero: stop.cod}).servicios.item[0];
						var stopDistance = latlong ? getDistance(latlong[0],latlong[1], stop.pos[0],stop.pos[1]) : 0;
						var bus = false;
						if (latlong && stop.prediction.distanciabus2 && !_.findWhere(line, {code: stop.prediction.ppubus2})) {
							line.push({
								type: 'bus',
								code: stop.prediction.ppubus2,
								pos: totoalDistance+Math.round(stopDistance-stop.prediction.distanciabus2),
								eta: stop.prediction.horaprediccionbus2,
								stop: stop.cod
							});
							bus = true;
						}
						if (latlong && stop.prediction.distanciabus1 && !_.findWhere(line, {code: stop.prediction.ppubus1})) {
							line.push({
								type: 'bus',
								code: stop.prediction.ppubus1,
								pos: totoalDistance+Math.round(stopDistance-stop.prediction.distanciabus1),
								eta: stop.prediction.horaprediccionbus1,
								stop: stop.cod
							});
							bus = true;
						}
						if (bus || true) {
							line.push({
								type: 'stop', 
								code: stop.cod, 
								name: stop.name,
								pos: totoalDistance+Math.round(stopDistance)
							});
						}
						totoalDistance += Math.round(stopDistance);
						latlong=[stop.pos[0],stop.pos[1]];
						delete stop.servicios
						return stop;
					});
					// console.log(line);
					// console.log('\n\n\n\n');
		    	return res.json({stops: stops, line: line});
				}
			);
		});

  },

  index: function(req, res){
  	var request = require('request');
  	var cheerio = require('cheerio');
  	var url = 'http://web.smsbus.cl/web/buscarAction.do?d=cargarServicios';

  	request(url, function(error, response, html){
			var services = [];
			if(!error){
				var $ = cheerio.load(html);

				_.each($('select#lista_servicio')[0].children, function(c){
					if (c.attribs && c.attribs.value) {
						services.push(c.attribs.value);
					}
				});	
			}
	  	return res.view('service/random', {services: services});
		});

  },

};

