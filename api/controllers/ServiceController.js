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
		console.log("Requesting "+service)

		function getDistance(lat1, lon1, lat2, lon2) {
			var p = 0.017453292519943295;    // Math.PI / 180
			var c = Math.cos;
			var a = 0.5 - c((lat2 - lat1) * p)/2 + 
			        c(lat1 * p) * c(lat2 * p) * 
			        (1 - c((lon2 - lon1) * p))/2;

			return 1000 * 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
		}

		function getBearing(lat1, lon1, lat2, lon2) {
			function e(a) {
				return a * (Math.PI / 180)
			}
			var r = Math.sin(e(lon2-lon1)) * Math.cos(e(lat2));
			var l = Math.cos(e(lat1)) * Math.sin(e(lat2)) - Math.sin(e(lat1)) * Math.cos(e(lat2)) * Math.cos(e(lon2-lon1));
			var i = Math.atan2(r, l);
    	return i;
    	// return 180 * i / Math.PI;
		}

		function getPosition(lat1, lon1, d, brng) {
			function rad(a) {
				return a * Math.PI / 180
			}
			function deg(a) {
				return 180 * a / Math.PI;
			}

			d = d/6371.0;
			lat1 = rad(lat1);
			lon1 = rad(lon1);
			var lat2 = Math.asin( Math.sin(lat1)*Math.cos(d) + Math.cos(lat1)*Math.sin(d)*Math.cos(brng) );
			var lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(d)*Math.cos(lat1), Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));
			return [deg(lat2), deg(lon2)];
		}

		client.get('restservice/rest/getrecorrido/'+service)
			.then(function(response) {
				var stopsInfo = [];
				var line = [];
				var shapes = response.body[direction].shapes;
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
						var brng = null;

						if (latlong) {
							brng = getBearing(stop.pos[0],stop.pos[1],latlong[0],latlong[1]);
						}
						if (latlong && stop.prediction.distanciabus2 && !_.findWhere(line, {code: stop.prediction.ppubus2})) {
							var ll = getPosition(stop.pos[0],stop.pos[1],parseInt(stop.prediction.distanciabus2)/1000.0,brng);
							line.push({
								type: 'bus',
								code: stop.prediction.ppubus2,
								pos: totoalDistance+Math.round(stopDistance-stop.prediction.distanciabus2),
								eta: stop.prediction.horaprediccionbus2,
								stop: stop.cod,
								latlng: ll
							});
							console.log(stop.prediction.ppubus2);
						}
						if (latlong && stop.prediction.distanciabus1 && !_.findWhere(line, {code: stop.prediction.ppubus1})) {
							var ll = getPosition(stop.pos[0],stop.pos[1],parseInt(stop.prediction.distanciabus1)/1000.0,brng);
							line.push({
								type: 'bus',
								code: stop.prediction.ppubus1,
								pos: totoalDistance+Math.round(stopDistance-stop.prediction.distanciabus1),
								eta: stop.prediction.horaprediccionbus1,
								stop: stop.cod,
								latlng: ll
							});
							console.log(stop.prediction.ppubus1);
						}
						line.push({
							type: 'stop', 
							code: stop.cod, 
							name: stop.name,
							pos: totoalDistance+Math.round(stopDistance),
							latlng: [stop.pos[0],stop.pos[1]],
						});

						totoalDistance += Math.round(stopDistance);
						latlong=[stop.pos[0],stop.pos[1]];
						delete stop.servicios
						return stop;
					});
					// console.log(line);
					// console.log('\n\n\n\n');
					console.log(_.reject(line, {type: 'stop'}).length+"\n\n\n");
		    	return res.json({stops: stops, line: line, shapes: shapes});
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

  map: function(req, res){
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
	  	return res.view('service/map', {services: services});
		});

  },

};

