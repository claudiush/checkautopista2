function Analysis() {
	this.exTotal = undefined;
	this.exRef = undefined;
	this.exName = undefined;
	this.exExitTo = undefined;
	this.exDest = undefined;
	this.exDir = undefined;
	this.exUnmarked = undefined;
	this.tolls = undefined;
	this.areas = undefined;
}

Freeway.prototype.getAnalysis = function () {
	//Exits and other nodes
	var exRef = 0;
	var exName = 0;
	var exExitTo = 0;
	var exDest = 0;
	var exDir = 0;
	for (var i = 0; i < this.exits.length; i++) {
		if (this.exits[i].ref!=undefined) { exRef++; };
		if (this.exits[i].name!=undefined) { exName++; };
		if (this.exits[i].exit_to!=undefined) { exExitTo++; };
		if (this.exits[i].destination!=undefined) { exDest++; };
		if (this.exits[i].name!=undefined || this.exits[i].exit_to!=undefined || this.exits[i].destination!=undefined) { exDir++; };
	};
	this.analysis.exTotal = this.exits.length;
	this.analysis.exRef = exRef;
	this.analysis.exName = exName;
	this.analysis.exExitTo = exExitTo;
	this.analysis.exDest = exDest;
	this.analysis.exDir = exDir;
	this.analysis.exUnmarked = this.unmarked.length;
	this.analysis.tolls = this.tolls.length;
	this.analysis.areas = this.areasNode.length+this.areasWay.length;
	// Show
	this.addToMap();
	// Ways
	var wAll = 0;
	var wNoLanes = 0;
	var wNoMaxspeed = 0;
	var wNone = 0;
	for (var i = 0; i < this.waysIDs.length; i++) {
		if(way[this.waysIDs[i]].tags==undefined||way[this.waysIDs[i]].tags.lanes==undefined&&way[this.waysIDs[i]].tags.maxspeed==undefined) { 
			wNone += way[this.waysIDs[i]].getLength(); }
		else if (way[this.waysIDs[i]].tags.lanes==undefined) { wNoLanes += way[this.waysIDs[i]].getLength(); }
		else if (way[this.waysIDs[i]].tags.maxspeed==undefined) { wNoMaxspeed += way[this.waysIDs[i]].getLength(); }
		else { wAll += way[this.waysIDs[i]].getLength(); };
	};
	this.analysis.wAll = wAll;
	this.analysis.wNoLanes = wNoLanes;
	this.analysis.wNoMaxspeed = wNoMaxspeed;
	this.analysis.wNone = wNone;
	this.analysis.wTotal = wAll+wNoLanes+wNoMaxspeed+wNone;
	//Total
	this.analysis.score = (0.3*(exDest+exExitTo*0.5)+0.4*exRef)/this.analysis.exTotal+0.3*(wAll+wNoLanes*0.3+wNoMaxspeed*0.3)/this.analysis.wTotal;
	// Show
	this.addToSidebar();
}

Freeway.prototype.addToMap = function() {
	// Clear Map
	if (typeof mapDataLayer !== 'undefined') { map.removeLayer(mapDataLayer); };
	mapDataLayer = L.layerGroup();
	// Ways
	for (var i = 0; i < this.waysIDs.length; i++) {
		var latlngs = [];
		for (var j = 0; j < way[this.waysIDs[i]].nodes.length; j++) {
			latlngs.push({lat:node[way[this.waysIDs[i]].nodes[j]].lat, lng:node[way[this.waysIDs[i]].nodes[j]].lon});
		};
		var polyline = L.polyline(latlngs, styleWay(way[this.waysIDs[i]].tags));
		polyline.element = way[this.waysIDs[i]];
		polyline.type = 'polyline';
		way[this.waysIDs[i]].polyline = polyline;
		mapDataLayer.addLayer(polyline);
	};
	//Areas
	for (var i = 0; i < this.areasWay.length; i++) {
		var latlngs = [];
		for (var j = 0; j < way[this.areasWay[i].wayID].nodes.length; j++) {
			latlngs.push({lat:node[way[this.areasWay[i].wayID].nodes[j]].lat, lng:node[way[this.areasWay[i].wayID].nodes[j]].lon});
		};
		var polygon = L.polygon(latlngs, styleWay(way[this.areasWay[i].wayID].tags));
		polygon.element = way[this.areasWay[i].wayID];
		polygon.type = 'polygon';
		way[this.areasWay[i].wayID].polygon = polygon;
		mapDataLayer.addLayer(polygon);
		var marker = L.circleMarker({lat:this.areasWay[i].center.lat, lng:this.areasWay[i].center.lon}, styleNode(this.areasWay[i]));
		marker.element = way[this.areasWay[i].wayID];
		marker.type = 'marker';
		way[this.areasWay[i].wayID].marker = marker;
		mapDataLayer.addLayer(marker);
	};
	// Nodes
	var nodes = this.exits.concat(this.tolls).concat(this.areasNode).concat(this.unmarked);
	nodes.sort(function (a,b) {return a.lat < b.lat ? +1  : -1 ;});
	for (var i = 0; i < nodes.length; i++) {
		var marker = L.circleMarker({lat:nodes[i].lat, lng:nodes[i].lon}, styleNode(nodes[i]));
		marker.element = node[nodes[i].nodeID];
		marker.type = 'marker';
		node[nodes[i].nodeID].marker = marker;
		mapDataLayer.addLayer(marker);
	};
	mapDataLayer.addTo(map);
	updateVisibility();
}

Freeway.prototype.addToSidebar = function () {
	if (this.loaded==3) {
		$('li#stats i').attr('class', 'fa fa-bar-chart');
		sidebar.open('stats');
	};
	mapDataLayer.eachLayer( function (layer) {
		layer.on('click', function (e) {
			$('li#info').show();
			$('div#info div#tags').html(getHtml(this.element));
			sidebar.open('info');
		});
	});
	// Stats
	var fw = this;
	$('div#stats h2').html(fw.name+' ('+(fw.ref||'').replace('-','&#8209;')+')<br/>');
	$('div#stats p#buttons').html(' <button class="icon" onClick="fw['+fw.relID+'].zoom()"><i class="fa fa-eye icon"></i></button>'+
		' <a href="http://openstreetmap.com/relation/'+fw.relID+'" target="_blank"><button class="icon"><img class="icon" src="img/osm-logo.png"></img></button></a>'+
		' <a href="http://127.0.0.1:8111/load_object?new_layer=false&objects=relation'+fw.relID+'" target="_blank"><button class="icon"><img class="icon" src="img/josm-logo.png"></img></button></a>'+
		' <a href="http://www.openstreetmap.org/edit?editor=id&relation='+fw.relID+'" target="_blank"><button class="icon"><img class="icon" src="img/id-logo.png"></img></button></a>'+
		' <a href="http://ra.osmsurround.org/analyzeRelation?relationId='+fw.relID+'" target="_blank"><button class="icon">An</button></a>'+
		' <a href="http://osmrm.openstreetmap.de/relation.jsp?id='+fw.relID+'" target="_blank"><button class="icon">Ma</button></a>');

	$('div#stats p#timestamp').html(fw.timestamp);
	$('div#stats tr#toll td#data').html();
	$('div#stats tr#exDest td#data').html(fw.analysis.exDest);
	$('div#stats tr#exExitTo td#data').html(fw.analysis.exExitTo);
	$('div#stats tr#exName td#data').html(fw.analysis.exName);
	$('div#stats tr#exNone td#data').html(fw.analysis.exTotal-fw.analysis.exDir);
	$('div#stats tr#exUnmarked td#data').html(fw.analysis.exUnmarked);
	$('div#stats tr#exRef td#data').html(fw.analysis.exRef);
	$('div#stats tr#exNoRef td#data').html(fw.analysis.exTotal-fw.analysis.exRef);
	$('div#stats tr#tolls td#data').html(fw.analysis.tolls);
	$('div#stats tr#areas td#data').html(fw.analysis.areas);
	$('div#stats tr#wAll td#data').html(Math.round(10000*fw.analysis.wAll/fw.analysis.wTotal)/100+' %');
	$('div#stats tr#wNoLanes td#data').html(Math.round(10000*fw.analysis.wNoLanes/fw.analysis.wTotal)/100+' %');
	$('div#stats tr#wNoMaxspeed td#data').html(Math.round(10000*fw.analysis.wNoMaxspeed/fw.analysis.wTotal)/100+' %');
	$('div#stats tr#wNone td#data').html(Math.round(10000*fw.analysis.wNone/fw.analysis.wTotal)/100+' %');
}

Freeway.prototype.zoom = function () {
	map.fitBounds(L.latLngBounds(L.latLng(this.bounds.minlat,this.bounds.minlon), L.latLng(this.bounds.maxlat,this.bounds.maxlon)));
}

Way.prototype.getLength = function () {
	var dist = 0;
	for (var i = 0; i < this.polyline.getLatLngs().length-1; i++) {
		dist += this.polyline.getLatLngs()[i].distanceTo(this.polyline.getLatLngs()[i+1]);
	};
	return dist;
}

Way.prototype.zoom = function () {
	map.fitBounds(this.polyline.getBounds());
}

Node.prototype.zoom = function () {
	map.setView(this.marker.getLatLng(),18);
}

function getHtml(element) {
	var t_html = '';
	if (element.subtype=='exit') {
		t_html += htmlPanel(element.destination || element.exit_to || element.name || '&nbsp;', element.ref || '&nbsp;');
	}
	if (element.nodeID!=undefined) {
		t_html += '<h3>Node : ' + element.nodeID +
			' <a href="http://openstreetmap.com/node/'+element.nodeID+'" target="_blank"><button class="icon"><img class="icon" src="img/osm-logo.png"></img></button></a>'+
			' <a href="http://127.0.0.1:8111/load_object?new_layer=false&objects=node'+element.nodeID+'" target="_blank"><button class="icon"><img class="icon" src="img/josm-logo.png"></img></button></a>'+
			' <a href="http://www.openstreetmap.org/edit?editor=id&node='+element.nodeID+'" target="_blank"><button class="icon"><img class="icon" src="img/id-logo.png"></img></button></a>'+
			' <a href="http://level0.osmz.ru/?url=node/'+element.nodeID+'" target="_blank"><button class="icon">L0</button></a>'+
			'</h3>';
		t_html += '<table class="tags">';
		for (key in element.tags) {
			t_html += '<tr><td class="code key">'+key+'</td><td class="code">'+element.tags[key].replace('<','&lt;').replace(/;/g,';&#8203;') +'</td></tr>';
		};
		if (element.tags==undefined) { t_html += '<p>No tags</p>'};
		t_html += '</table>';
	};
	if (element.wayID!=undefined) {
		t_html += '<h3>Way : ' + element.wayID +
		' <a href="http://openstreetmap.com/way/'+element.wayID+'" target="_blank"><button class="icon"><img class="icon" src="img/osm-logo.png"></img></button></a>'+
		' <a href="http://127.0.0.1:8111/load_object?new_layer=false&objects=way'+element.wayID+'" target="_blank"><button class="icon"><img class="icon" src="img/josm-logo.png"></img></button></a>'+
		' <a href="http://www.openstreetmap.org/edit?editor=id&way='+element.wayID+'" target="_blank"><button class="icon"><img class="icon" src="img/id-logo.png"></img></button></a>'+
		' <a href="http://level0.osmz.ru/?url=way/'+element.wayID+'" target="_blank"><button class="icon">L0</button></a>'+
		'</h3>';
		t_html += '<table class="tags">';
		for (key in way[element.wayID].tags) {
			t_html += '<tr><td class="code key">'+key+'</td><td class="code">'+way[element.wayID].tags[key].replace('<','&lt;').replace(/;/g,';&#8203;') +'</td></tr>';
		};
		if (element.tags==undefined) { t_html += '<p>No tags</p>'};
		t_html += '</table>';
	}
	t_html += '<p id="timestamp">'+fw[options.relID].timestamp+'<p>';
	return t_html;
}

function updateVisibility(clicked) {
	if (typeof clicked !== undefined) {
		var id = $(clicked).parent().parent().attr('id');
		if (['exDest','exExitTo','exName','exNone'].indexOf(id)!=-1) {
			$('#exRef .chk').prop('checked', false);
			$('#exNoRef .chk').prop('checked', false);
		};
		if (['exRef','exNoRef'].indexOf(id)!=-1) {
			$('#exDest .chk').prop('checked', false);
			$('#exExitTo .chk').prop('checked', false);
			$('#exName .chk').prop('checked', false);
			$('#exNone .chk').prop('checked', false);
		};
	};
	mapChange('exDest','removeLayer');
	mapChange('exExitTo','removeLayer');
	mapChange('exName','removeLayer');
	mapChange('exNone','removeLayer');
	mapChange('exRef','removeLayer');
	mapChange('exNoRef','removeLayer');
	if ($('#tolls .chk')[0].checked) { mapChange('tolls','addLayer'); } else { mapChange('tolls','removeLayer'); };
	if ($('#exDest .chk')[0].checked) { mapChange('exDest','addLayer'); };
	if ($('#exExitTo .chk')[0].checked) { mapChange('exExitTo','addLayer'); };
	if ($('#exName .chk')[0].checked) { mapChange('exName','addLayer'); };
	if ($('#exNone .chk')[0].checked) { mapChange('exNone','addLayer'); };
	if ($('#exUnmarked .chk')[0].checked) { mapChange('exUnmarked','addLayer'); } else { mapChange('exUnmarked','removeLayer'); };
	if ($('#exRef .chk')[0].checked) { mapChange('exRef','addLayer'); };
	if ($('#exNoRef .chk')[0].checked) { mapChange('exNoRef','addLayer'); };
	if ($('#areas .chk')[0].checked) { mapChange('areas','addLayer'); } else { mapChange('areas','removeLayer'); };
	if ($('#wAll .chk')[0].checked) { mapChange('wAll','addLayer'); } else { mapChange('wAll','removeLayer'); };
	if ($('#wNoLanes .chk')[0].checked) { mapChange('wNoLanes','addLayer'); } else { mapChange('wNoLanes','removeLayer'); };
	if ($('#wNoMaxspeed .chk')[0].checked) { mapChange('wNoMaxspeed','addLayer'); } else { mapChange('wNoMaxspeed','removeLayer'); };
	if ($('#wNone .chk')[0].checked) { mapChange('wNone','addLayer'); } else { mapChange('wNone','removeLayer'); };
}

function mapChange(group, action) {
	var id = options.relID;
	if (group=='tolls') {
		for (var i = 0; i < fw[id].tolls.length; i++) {
			map[action](fw[id].tolls[i].marker);
		}
	} else if (group=='exDest') {
		for (var i = 0; i < fw[id].exits.length; i++) {
			if (fw[id].exits[i].destination!==undefined) { map[action](fw[id].exits[i].marker); };
		};
	} else if (group=='exExitTo') {
		for (var i = 0; i < fw[id].exits.length; i++) {
			if (fw[id].exits[i].destination==undefined&&fw[id].exits[i].exit_to!==undefined) { map[action](fw[id].exits[i].marker); };
		};
	} else if (group=='exName') {
		for (var i = 0; i < fw[id].exits.length; i++) {
			if (fw[id].exits[i].destination==undefined&&fw[id].exits[i].exit_to==undefined&&fw[id].exits[i].name!==undefined) { map[action](fw[id].exits[i].marker); };
		};
	} else if (group=='exNone') {
		for (var i = 0; i < fw[id].exits.length; i++) {
			if (fw[id].exits[i].destination==undefined&&fw[id].exits[i].exit_to==undefined&&fw[id].exits[i].name==undefined) { map[action](fw[id].exits[i].marker); };
		};
	} else if (group=='exUnmarked') {
		for (var i = 0; i < fw[id].unmarked.length; i++) {
			map[action](fw[id].unmarked[i].marker);
		};
	} else if (group=='exRef') {
		for (var i = 0; i < fw[id].exits.length; i++) {
			if (fw[id].exits[i].ref!==undefined) { map[action](fw[id].exits[i].marker); };
		};
	} else if (group=='exNoRef') {
		for (var i = 0; i < fw[id].exits.length; i++) {
			if (fw[id].exits[i].ref==undefined) { map[action](fw[id].exits[i].marker); };
		};
	} else if (group=='areas') {
		for (var i = 0; i < fw[id].areasNode.length; i++) {
			if (fw[id].areasNode[i].tags.highway=='services'||fw[id].areasNode[i].tags.highway=='rest_area') { map[action](fw[id].areasNode[i].marker); };
		};
		for (var i = 0; i < fw[id].areasWay.length; i++) {
			if (fw[id].areasWay[i].tags.highway=='services'||fw[id].areasWay[i].tags.highway=='rest_area') { map[action](fw[id].areasWay[i].marker); };
			if (fw[id].areasWay[i].tags.highway=='services'||fw[id].areasWay[i].tags.highway=='rest_area') { map[action](fw[id].areasWay[i].polygon); };
		};
	} else if (group=='wAll') {
		for (var i = 0; i < fw[id].waysIDs.length; i++) {
			if (way[fw[id].waysIDs[i]].tags==undefined) { continue; };
			if (way[fw[id].waysIDs[i]].tags.lanes!==undefined&&way[fw[id].waysIDs[i]].tags.maxspeed!==undefined) { map[action](way[fw[id].waysIDs[i]].polyline); };
		};
	} else if (group=='wNoLanes') {
		for (var i = 0; i < fw[id].waysIDs.length; i++) {
			if (way[fw[id].waysIDs[i]].tags==undefined) { continue; };
			if (way[fw[id].waysIDs[i]].tags.lanes==undefined&&way[fw[id].waysIDs[i]].tags.maxspeed!==undefined) { map[action](way[fw[id].waysIDs[i]].polyline); };
		};
	} else if (group=='wNoMaxspeed') {
		for (var i = 0; i < fw[id].waysIDs.length; i++) {
			if (way[fw[id].waysIDs[i]].tags==undefined) { continue; };
			if (way[fw[id].waysIDs[i]].tags.lanes!==undefined&&way[fw[id].waysIDs[i]].tags.maxspeed==undefined) { map[action](way[fw[id].waysIDs[i]].polyline); };
		};
	} else if (group=='wNone') {
		for (var i = 0; i < fw[id].waysIDs.length; i++) {
			if (way[fw[id].waysIDs[i]].tags==undefined) { map[action](way[fw[id].waysIDs[i]].polyline); continue; };
			if (way[fw[id].waysIDs[i]].tags.lanes==undefined&&way[fw[id].waysIDs[i]].tags.maxspeed==undefined) { map[action](way[fw[id].waysIDs[i]].polyline); };
		};
	};
}