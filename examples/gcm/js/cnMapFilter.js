//
// cnMapFilter.js
//
// View data on a map, where changing the map filters the data,
// only showing items that have coordinates/address on map's currently displayed canvas.
//
//
// Copyright (c) 2011 Chad Norwood
// Dual licensed under the MIT and GPL licenses:
//   http://www.opensource.org/licenses/mit-license.php
//   http://www.gnu.org/licenses/gpl.html
//

// cnMF, or window.cnMF, is the one and only global.  See cnMF.init() below

(function (window){

	// ba-debug.js - use debug.log() instead of console.log()
	// debug.setLevel(0) turns off logging,
	// 1 is just errors and timers
	// 2 includes warnings
	// 3 includes info - logs external data (calendar)
	// 9 is everything (log, info, warn, error)
	var lvl = window.location.href.match(/\bdebuglevel=(\d)/i);
	if (lvl && lvl[1]) {
		debug && debug.setLevel(parseInt(lvl[1],10));
		//console.log("setLevel=",lvl[1]);
	} else {
		debug && debug.setLevel(0); // turns off all logging
	}
	debug.includeMsecs(true);


	// EventClass - event objects created from this class contain all the
	// info needed for an event, including original info from the calendar data
	// plus coordinates and accurate address from geolocation service.
	// This is a core object to mapFilter.
	var EventClass = makeClass();
	EventClass.prototype.init = function ( params ) {
		// defaults for event object
		this.id = -1;
		this.lt = 0;
		this.lg = 0;
		this.validCoords = false;
		this.isDisplayed = false;
		this.addrOrig = '';
		this.addrToGoogle = '';
		this.addrFromGoogle = '';

		// overwrite defaults with params
		for (var ii in params) {
			this[ii] = params[ii];
		}
		// these are based on params
		this.dateStartObj = cnMF.parseDate(this.dateStart);
		this.dateEndObj = cnMF.parseDate(this.dateEnd);
	};
	EventClass.prototype.getCoordsStr = function(){
		return this.validCoords ?  this.lt + "," + this.lg : '';
	};
	EventClass.prototype.getDirectionsUrlStr = function(){
		return 'http://maps.google.com/maps?f=d&q=' + this.addrToGoogle.replace(/ /g, '+').replace(/"/g, '%22');
	};
	EventClass.prototype.getDirectionsHtmlStr = function(){
		return '<a href="' + this.getDirectionsUrlStr() + '" title="Get Directions using maps.google.com">Directions</a>';
	};
	EventClass.prototype.insideCurMap = function(mapbox){
		return this.validCoords ? mapbox.containsLatLng(new GLatLng(this.lt, this.lg, true)) : false;
	};
	// Returns true if current event occurs before start or after end.
	EventClass.prototype.isFilteredbyDate = function(startDayOffset,endDayOffset){
		var nowMs = new Date().getTime();
		var startTime = nowMs + startDayOffset *24*3600*1000; // ms
		var endTime   = nowMs + endDayOffset *24*3600*1000; // ms
		if (this.dateEndObj.getTime() < startTime) return true;
		if (this.dateStartObj.getTime() > endTime) return true;
		return false;
	};
	EventClass.prototype.setId = function ( id ) {
		this.id = id;
	};
	EventClass.prototype.setMarkerObj = function (mrkr) {
		//this.myGLatLng = existingGLatLng || new GLatLng(this.lt, this.lg);
		this.markerObj = mrkr;
	};
	EventClass.prototype.getMarkerObj = function () {
		return this.markerObj;
	};




	// MarkerClass - designed to contain all google markers for map.
	// Note that one marker can contain multiple events.
	var MarkerClass = makeClass();
	MarkerClass.prototype.init = function ( gMap ) {
		// allMarkers obj is the main obj, where key is the coordinates and the
		// value is markerObject - see addMarker
		this.allMarkers = {};
		this.gMap = gMap;  // the google map object
	}
	// getMarkerObj() returns the marker object
	MarkerClass.prototype.getMarkerObj = function(coordsStr){
		// TODO also accept event obj (then we get coords from that)
		return this.allMarkers[coordsStr];
	}
	// getGoogleMarker() returns the GMarker object created by google.
	MarkerClass.prototype.getGoogleMarker = function(coordsStr){
		// TODO also accept event obj (then we get coords from that)
		return this.allMarkers[coordsStr] && this.allMarkers[coordsStr].googleMarker;
	}
	// getEvents() returns an array of all event objects at the provided coordinates.
	MarkerClass.prototype.getEvents = function(coordsStr){
		// TODO also accept event obj (then we get coords from that)
		return this.allMarkers[coordsStr] && this.allMarkers[coordsStr].eventList;
	}
	// addMarker() creates google markers and event listener.
	MarkerClass.prototype.addMarker = function(eventObj){
		var coordsStr = eventObj.getCoordsStr();
		if (this.allMarkers[coordsStr]) {
			// Already have a marker at this location, so add event to list.
			this.allMarkers[coordsStr].eventList.push(eventObj.id);
			//debug.log("addMarker() added to existing marker, eventObj.id="+eventObj.id);
			return;
		}
		// No markers existing at this location, so create one.
		//debug.log("addMarker() creating marker, eventObj.id=%s, %o", eventObj.id, eventObj.getCoordsStr());
		var myGLatLng = new GLatLng(eventObj.lt, eventObj.lg);
		// http://code.google.com/apis/maps/documentation/javascript/v2/reference.html#GMarker
		var gMrkr = new GMarker( myGLatLng, {
				icon:iconDefault
				});
		GEvent.addListener(gMrkr, "click", function() {
			try {
				_gaq.push(['_trackEvent', 'Interaction', 'gMrkr', 'click']);
			} catch (e) {}
			cnMF.coreOptions.cbHighlightItem(eventObj.getCoordsStr()); 
		});
		this.gMap.addOverlay(gMrkr);
		this.allMarkers[coordsStr] = {
			googleMarker: gMrkr,
			gLatLng: myGLatLng, // note this can also be accessed via googleMarker.gLatLng()
			eventList: [eventObj.id]
		}
		return;
	}
	MarkerClass.prototype.removeMarkers = function(eventObj){
		var coordsStr = eventObj.getCoordsStr();
		for (var ii=0; this.allMarkers[coordsStr].eventList[ii]; ii++) {
			if (this.allMarkers[coordsStr].eventList[ii] === eventObj.id) {
				// found it, remove
				this.allMarkers[coordsStr].eventList.splice(ii, 1);
			}
		}
		if (this.allMarkers[coordsStr].eventList.length === 0) {
			this.gMap.removeOverlay(this.allMarkers[coordsStr].googleMarker);
			// remove gLatLng?
			delete this.allMarkers[coordsStr];
	   }
	}


	// TODO: do we use this anymore?
	function eventType(params){
		// http://stackoverflow.com/questions/383402/is-javascript-s-new-keyword-considered-harmful
		if (!(this instanceof eventType))
			return new eventType(params);

		this.filtersActive = false;
		for (var ii in params) {
			this[ii] = params[ii];
		}
	}


	//
	//  END PRIVATE FUNCTIONS and CLASSES
	//


	var cnMF = {
		gcTitle: 'A Calendar', // this should always get overwritten by calendar data
		gcLink: '',
		googleApiKey: '',
		reportData: {},
		processGeocodeTimer: 0,
		numDisplayed: 0,
		filteredByDate: false,
		filteredByMap: false,
		types: [],
		myMarkers: {},
		tz: {},
		eventList: []
	}

	// cnMF.init() starts it all
	//
	cnMF.init = function (coreOptions) {
		cnMF.coreOptions = coreOptions;
		cnMF.myMarkers = MarkerClass(coreOptions.gMap); // stores google map marker, and marker's corresponding events
		cnMF.curStartDay  = coreOptions.oStartDay;
		cnMF.curEndDay	= coreOptions.oEndDay;
		cnMF.origStartDay = coreOptions.oStartDay;
		cnMF.origEndDay   = coreOptions.oEndDay;
		cnMF.googleApiKey   = coreOptions.googleApiKey;
		
		cnMF.tz.offset = coreOptions.tzOffset ? coreOptions.tzOffset : ''; // Offset in hours and minutes from UTC
		cnMF.tz.name = coreOptions.tzName ? coreOptions.tzName : 'unknown'; // Olson database timezone key (ex: Europe/Berlin)
		cnMF.tz.dst = coreOptions.tzDst ? coreOptions.tzDst : 'unknown'; // bool for whether the tz uses daylight saving time
		cnMF.tz.computedFromBrowser = (cnMF.tz.name != 'unknown');
	}

	cnMF.countTotal = function () {
		return cnMF.eventList.length;
		// todo: support start/end
	}
	cnMF.countKnownAddresses = function () {
		var xx = 0;
		for (var ii in cnMF.eventList) {
		 if (cnMF.eventList[ii].validCoords) xx++;
		}
		//cnMF.reportData.knownAddr = xx;
		return xx;
	}
	cnMF.countUnknownAddresses = function(){
		var xx = 0;
		for (var ii in cnMF.eventList) {
		 if (! cnMF.eventList[ii].validCoords) xx++;
		}
		//cnMF.reportData.unknownAddr = xx;
		return xx;
	}
	cnMF.addEvent = function(params){ // old addEventObj
		var e = EventClass(params);
		e.setId(cnMF.eventList.length);
		//cnMF.debugObj(e);
		cnMF.eventList.push(e);
		return e;
	}
	cnMF.addEventType = function(params){
		var e = new eventType(params);
		e.id = cnMF.types.length;
		cnMF.types.push(e);
		return e;
	}

	//
	// mapAllEvents() adjusts zoom and coords in order to fit all events on map
	//
	cnMF.mapAllEvents = function(){
		// first create the box that holds all event locations
		var box = null;
		for (var i in cnMF.eventList) {
			var kk = cnMF.eventList[i];
			if (! kk.validCoords) continue; // skip unrecognized addresses

			if (box === null) {
				var corner = new GLatLng(kk.lt, kk.lg, true);
				box = new GLatLngBounds(corner, corner);
			} else {
				box.extend(new GLatLng(kk.lt, kk.lg, true));
			}
		}

		if (!box) {
			debug.log("mapAllEvents(): no events");
			return false;
		}

		debug.log("mapAllEvents(): setting new map ");
		zoom = cnMF.coreOptions.gMap.getBoundsZoomLevel(box);
		cnMF.coreOptions.gMap.setCenter( box.getCenter(), (zoom < 2) ? zoom : zoom - 1  );
	}

	cnMF.processGeocode = function(gObj) {
		for (var ii in cnMF.eventList) {
			var kk = cnMF.eventList[ii];
			if (kk.addrToGoogle != gObj.addr1) {
				continue;
			}
			if (kk.validCoords) {
				debug.log( 'received duplicate geocode', gObj);
				continue;
			}

			if (gObj.lt) {
				kk.lt = gObj.lt;
				kk.lg = gObj.lg;
				kk.validCoords = true;
				kk.addrFromGoogle = gObj.addr2;
			}
			else if (gObj.error) {
				kk.addrFromGoogle = 'address unrecognizable';
				kk.error = gObj.error;
			}
		}
		// if geocoding takes longer than xx ms, then mapRedraw()
		var now = new Date().getTime();
		if (!cnMF.processGeocodeTimer) cnMF.processGeocodeTimer = now;

		if (now - cnMF.processGeocodeTimer > 1000) {
			debug.log( 'processGeocodeTimer:', now-cnMF.processGeocodeTimer)
			cnMF.processGeocodeTimer = now;
			//mapAllEvents();
			//onGeoDecodeComplete();
		}
	}



	// returns true if changes were made to map, false otherwise
	//
	cnMF.updateMarkers= function(){

		debug.log( "cnMF.updateMarkers() called ..");
		mapbox = cnMF.coreOptions.gMap.getBounds();

		if(0) debug.time('checking all markers');
		added = 0;
		removed = 0;
		unchanged = 0;
		cnMF.filteredByDate = false;
		cnMF.filteredByMap = false;
		//debug.log( "reset filteredByDate and filteredByMap to FALSE");

		for (var i in cnMF.eventList) {
			var kk = cnMF.eventList[i];

			insideCurMap = kk.insideCurMap(mapbox);
			debug.log( "marker "+ (insideCurMap ? 'in':'out') +"side map %o", kk);
			if (!insideCurMap) {
				debug.log( " filteredByMap = true for ",kk);
				cnMF.filteredByMap = true;
			}

			filteredOut = kk.isFilteredbyDate(cnMF.curStartDay,cnMF.curEndDay);

			/* OLDTODO: fix filters - add search, categories, time
			if (events.types[kk.type].filtersActive) {
				//isFiltered = markers.type[kk.type].filter(kk);
				filteredOut = false;
			}
			*/
			if (filteredOut) {
				cnMF.filteredByDate = true;
			}
			if (kk.isDisplayed && insideCurMap && !filteredOut) {
				unchanged++;
			}
			else if (kk.isDisplayed && (!insideCurMap || filteredOut)) {
				// hide all markers outside of map or current filters
				kk.isDisplayed = false;
				cnMF.myMarkers.removeMarkers(kk);
				removed++;
			}
			else if (!kk.isDisplayed && insideCurMap && !filteredOut) {
				// display events new to map
				cnMF.coreOptions.cbBuildInfoHtml(kk);
				cnMF.myMarkers.addMarker(kk);
				kk.isDisplayed = true;
				added++;
			}
		}
		if(0) debug.timeEnd('checking all markers');

		cnMF.numDisplayed = unchanged + added;
		//cnMF.reportData.numDisplayed = cnMF.numDisplayed;

		debug.info("updateMarkers() "+removed+" removed, "+added+" added, "+unchanged+" unchanged, "
		+cnMF.numDisplayed+" total ");

		return (removed || added);
	}



	// showDays(): Shows all events from newStartDay to newEndDay, called when date slider dragging stops
	// newStartDay to newEndDay are both number of days relative to today
	// Currently, newStartDay and newEndDay should be within original calendar start/end days (no ajax req'd)
	///
	cnMF.showDays = function (newStartDay, newEndDay) {
		// todo: query gcal
		cnMF.curStartDay = newStartDay;
		cnMF.curEndDay = newEndDay;
		cnMF.coreOptions.cbMapRedraw();  // triger updateMarkers();
	}


	cnMF.getGCalData = function(gCalUrl, startDays, endDays, callbacks ) {
		if (gCalUrl.search(/^http/i) < 0) {
			debug.warn("getGCalData(): bad url: "+ gCalUrl);
			return;
		}
		gCalUrl = gCalUrl.replace(/\/basic$/, '/full');
		//startmax = '2009-07-09T10:57:00-08:00';

		// TODO: change rfc3339 to accept StartDays
		startDate = new Date();
		startDate.setTime(startDate.getTime() + startDays*24*3600*1000);
		startmin = cnMF.rfc3339(startDate,false);
		debug.info("getGCalData(): start-min: "+startmin);

		endDate = new Date();
		endDate.setTime(endDate.getTime() + endDays*24*3600*1000);
		startmax = cnMF.rfc3339(endDate,true);
		debug.info("getGCalData(): start-max: "+startmax);

		// http://code.google.com/apis/calendar/docs/2.0/reference.html
		gCalObj = {
			'start-min': startmin,
			'start-max': startmax,
			'max-results': 200,
			'orderby'  : 'starttime',
			'sortorder': 'ascending',
			'singleevents': false
		};
		if (cnMF.tz.name != 'unknown') {
			gCalObj.ctz = cnMF.tz.name; // ex: 'America/Chicago'
			debug.info("Displaying calendar times using this timezone: "+ gCalObj.ctz);
		}
		$.getJSON(gCalUrl + "?alt=json-in-script&callback=?", gCalObj, function(cdata) {
			parseGCalData(cdata, startDate, endDate, callbacks);
		});
	}

	function parseGCalData (cdata, startDate, endDate, callbacks ) {

		debug.info("parseGCalData() calendar data: ",cdata);

		cnMF.gcTitle = cdata.feed.title ? cdata.feed.title['$t'] : 'title unknown';
		cnMF.gcLink = cdata.feed.link ? cdata.feed.link[0]['href'] : '';
		cnMF.desc = cdata.feed.subtitle ? cdata.feed.subtitle['$t'] : 'subtitle unknown';
		cnMF.reportData['fn'] = cnMF.gcTitle.replace(/\W/,"_");
		cnMF.gcTitle = cdata.feed.title ? cdata.feed.title['$t'] : 'title unknown';
		if (!cnMF.tz.computedFromBrowser) {
			cnMF.tz.name = cdata.feed.gCal$timezone.value;
			debug.info("Displaying calendar times using calendar timezone: "+ cnMF.tz.name);
		}
		var uniqAddr={};

		/* do we need this at all anymore?
		eType = cnMF.addEventType({
		  tableHeadHtml: "<td>one</td><td>two</td>",
		  tableCols: [3,5],
		  title: cnMF.gcTitle,
		  titleLink: cnMF.gcLink
		});
		*/
		for (var ii=0; cdata.feed.entry && cdata.feed.entry[ii]; ii++) {
			var curEntry = cdata.feed.entry[ii];
			if (!(curEntry['gd$when'] && curEntry['gd$when'][0]['startTime'])) {
				debug.info("skipping cal curEntry (no gd$when) %s (%o)", curEntry['title']['$t'], curEntry);
				return true; // continue to next one
			};
			var url = {};
			for (var jj=0; curEntry.link[jj]; jj++) {
				var curLink = curEntry.link[jj];
				if (curLink.type == 'text/html') {
					// looks like when rel='related', href is original event info (like meetup.com)
					// when rel='alternate', href is the google.com calendar event info
					url[curLink.rel] = curLink.href;
				}
			}
			kk = cnMF.addEvent({
				//type: eType.id,
				name: curEntry['title']['$t'],
				desc: curEntry['content']['$t'],
				addrOrig: curEntry['gd$where'][0]['valueString'] || '',  // addrOrig is the location field of the event
				addrToGoogle: curEntry['gd$where'][0]['valueString'] || '',
				gCalId: curEntry['gCal$uid']['value'],
				url: url.related || url.alternate, // TODO - is this what we want? see href above
				dateStart: cnMF.parseDate(curEntry['gd$when'][0]['startTime']),
				dateEnd: cnMF.parseDate(curEntry['gd$when'][0]['endTime'])
			});
			// make ready for geocode TODO: remove this? or move this line to addrToGoogle above
			kk.addrToGoogle = kk.addrToGoogle.replace(/\([^\)]+\)\s*$/, ''); // remove parens and text inside parens
			if (kk.addrToGoogle) {
				uniqAddr[kk.addrToGoogle] = 1;
			} else {
				debug.info("Skipping blank address for "+kk.name+" ["+kk.addrOrig+"]",kk);
			}
			debug.log("parsed curEntry "+ii+": ", kk.name, curEntry, kk);
		}
		cnMF.totalEntries = ii;
		cnMF.totalEvents = cdata.feed.openSearch$totalResults.$t || cnMF.totalEntries;

		debug.log("calling mapfilter.geocode(): ", uniqAddr );
		cnMF.myGeoDecodeComplete = false;
		cnMF.myGeo = cnMF.geocodeManager({
			addresses: uniqAddr,
			googleApiKey: cnMF.googleApiKey,
			geocodedAddrCallback: function (gObj) {
				cnMF.processGeocode(gObj); // TODO: this can be private
				if ('function' === typeof callbacks.onGeoDecodeAddr) callbacks.onGeoDecodeAddr();
			},
			geocodeCompleteCallback: function() {
				//onGeoDecodeComplete();
				cnMF.myGeoDecodeComplete = true;
				if ('function' === typeof callbacks.onGeoDecodeComplete) callbacks.onGeoDecodeComplete();
			}
		});
		if ('function' === typeof callbacks.onCalendarLoad) callbacks.onCalendarLoad();
	}


	// geocodeManager handles the geocoding of addresses
	//
	// TODO: use more than just google maps api
	//
	// http://tinygeocoder.com/blog/how-to-use/
	// http://github.com/straup/js-geocoder
	// http://www.geowebguru.com/articles/185-arcgis-javascript-api-part-1-getting-started
	//
	// TODO: use GeoAPI's reverse geocoder to get neighborhood (SOMA/Mission/marina, SF CA)
	//
	// TODO: create a local geocode cache server and mysql db?
	// http://code.google.com/apis/maps/articles/phpsqlajax.html
	///
	cnMF.geocodeManager = function( gOpts ) {

		// count addreses and unique addreses.
		// don't want duplicates - wasting calls to google
		var uniqAddresses = {};
		var numAddresses = numUniqAddresses = numUniqAddrDecoded = numUniqAddrErrors = 0;
		var geoCache = {};

		var numReqs = 0;
		var startTime = new Date().getTime();

		//  won't stop till all address objects are resolved (resolved==true)
		//  when resolved is true, then if (validCoords) it was successful
		//  otherwise look to error
		//
		function addrObject(address) {
			this.addr1 = address;
			this.addr2 = ''; // from google
			this.inProgress = false;
			this.sentTimes = 0;
			this.resolved = false;
			this.validCoords = false;
			this.error = '';
			this.lt = '';
			this.lg = '';
		}

		function geoMgrInit(){
			for (var ii in gOpts.addresses) {
				if (!(ii.length > 0)) {
					debug.warn("geocodeManager-geoMgrInit() skipping blank address");
					continue;
				}
				numAddresses++;
				if (!isNaN(ii)) {
					uniqAddresses[gOpts.addresses[ii]] = 1; // array
				} else {
					uniqAddresses[ii] = 1; // object or string
				}
			}
			for (var addr in uniqAddresses) {
				if (geoCache[addr]) {
					gOpts.geocodedAddrCallback(geoCache[addr]);
					continue;
				}
				geoCache[addr] = new addrObject(addr);
				numUniqAddresses++;
			}
			gGeocodeQueue();
		}

		function allResolved() {
			for (var addr in geoCache) {
				if (!geoCache[addr].resolved) return false;
			}
			return true;
		}

		function getUnresolved() {
			for (var addr in geoCache) {
				ao = geoCache[addr];
				if (!ao.resolved && !ao.inProgress) return ao;
			}
			return false;
		}

		function checkInProgress(ems) {
			for (var addr in geoCache) {
				ao = geoCache[addr];
				if (ao.inProgress && (ems - ao.sentLast > 2000)) {
					if (ao.sentTimes > 3) {
						ao.resolved = true;
						numUniqAddrErrors++;
						debug.log('checkInProgress() forgetting request '+ao.reqNum, ao);
						gOpts.geocodedAddrCallback(ao);
					} else {
						ao.inProgress = false;
						debug.log('checkInProgress() resetting request '+ao.reqNum+' after '+(ems-ao.sentLast)+'ms', ao);
					}
				}
			}
			return false;
		}

		// gGeocodeQueue()
		//
		// Note: Google allows 15k lookups per day per IP.  However, too many requests
		// at the same time triggers a 620 code from google.  Therefore we want about 100ms
		// delay between each request using gGeocodeQueue.  Likewise, when we get a 620 code,
		// we wait a bit and resubmit.
		// http://code.google.com/apis/maps/faq.html#geocoder_limit
		//
		// NOTE: yahoo allows 5k lookups per day per IP
		// http://developer.yahoo.com/maps/rest/V1/geocode.html
		//
		var desiredRate = 100; // long-term average should be one query every 'desiredRate' ms
		var maxBurstReq = 4;   // if timeout gets delayed, say 500ms, we can send 'maxBurstReq' at a time till we catch up
		var maxRetry = 4;
		function gGeocodeQueue () {
			ems = new Date().getTime() - startTime;
			bursts = maxBurstReq;
			while (bursts-- && (ems > numReqs*desiredRate ) && (ao = getUnresolved())) {
				ao.reqNum = ++numReqs;
				ao.inProgress = true;
				ao.sentLast = ems;
				ao.sentTimes++;
				debug.log("	gGeocodeQueue() sending req "+numReqs+" at "+ems+"ms, addr: ", ao.addr1);
				cnMF.gGeocode( ao.addr1, gOpts.googleApiKey, function (gObj) {
				  	parseGObj(gObj);
				});
				ems = new Date().getTime() - startTime;
			}
			checkInProgress(ems);

			if (allResolved()) {
				debug.log("gGeocodeQueue() all queries complete, geocoder done");
				gOpts.geocodeCompleteCallback();
				return;
			}
			setTimeout(function() { gGeocodeQueue() }, desiredRate);
		}

		function parseGObj(gObj) {
			if (typeof(gObj) != 'object') {
				debug.warn("parseGObj() shouldn't be here " + typeof(gObj), gObj);
				return;
			}
			if (gObj.tmpError) {
				if (gObj.errorCode == 620) {
					debug.log("parseGObj() resubmit (too fast)", gObj.addr1, gObj);
					desiredRate = 1.1 * desiredRate; // slow down requests
				} else {
					debug.log("parseGObj() resubmit (timeout) ", gObj.addr1, gObj);
				}
				if (gObj.addr1) {
					geoCache[gObj.addr1].inProgress = false;
					geoCache[gObj.addr1].error = gObj.error;
				}

			} else if (gObj.error) {
				debug.info("parseGObj() error ", gObj);
				geoCache[gObj.addr1].resolved = true;
				geoCache[gObj.addr1].validCoords = false;
				geoCache[gObj.addr1].inProgress = false;
				geoCache[gObj.addr1].error = gObj.error;
				numUniqAddrErrors++;
				gOpts.geocodedAddrCallback(geoCache[gObj.addr1]);

			} else if (gObj.lt) {
				if (!gObj.addr1 || !geoCache[gObj.addr1]) {
					debug.warn("parseGObj() debug me", gObj);
					return;
				}
				geoCache[gObj.addr1].lt = gObj.lt;
				geoCache[gObj.addr1].lg = gObj.lg;
				geoCache[gObj.addr1].addr2 = gObj.addr2;
				geoCache[gObj.addr1].resolved = true;
				geoCache[gObj.addr1].validCoords = true;
				geoCache[gObj.addr1].inProgress = false;
				debug.log("parseGObj() got coords ", gObj.addr1, gObj, geoCache[gObj.addr1]);

				numUniqAddrDecoded++;
				gOpts.geocodedAddrCallback(geoCache[gObj.addr1]);

			} else {
			  debug.warn("parseGObj() should not be here ", gObj);
			}
		}

		geoMgrInit();

		return {
			numAddresses: numAddresses,
			numUniqAddresses: numUniqAddresses,
			count: function() {
				var c = {
					uniqAddrDecoded: 0,
					uniqAddrErrors: 0,
					uniqAddrTotal: 0
				}
				for (var addr in geoCache) {
					ao = geoCache[addr];
					c.uniqAddrTotal++;
					if (ao.resolved && ao.validCoords) c.uniqAddrDecoded++;
					if (ao.resolved && !ao.validCoords) c.uniqAddrErrors++;
				}
				return c;
			}
		}
	}

	//  description of gObj
	// geocodeObj: {
	// 	  lg: null, // number, -180 +180
	// 	  lt: null, // number, -90 +90
	// 	  addr2: null, // string, google's rewording of addr1
	// 	  addr1: null, // string, address passed to geocoder
	// 	  errorCode: null, // number
	// 	  tmpError: false, // boolean
	// 	  error: null // string error msg
	// },
	//

	// gGeocode() translates addresses into array of lat/lng coords using Google, also see gGeocodeQueue()
	//
	cnMF.gGeocode = function( addr, googleApiKey, callback ) {

		//debug.log("gGeocode() submitting addr to google: " + addr);
		//$("#"+ cnMFUI.opts.listId ).append('.');

		//  switched from getJson to ajax to handle errors.  However, looks like error function is not called
		//  when google responds with http 400 and text/html (versus http 200 with text/javascript)
		//
		// http://groups.google.com/group/google-maps-api/browse_thread/thread/e347b370e8586767/ddf95bdb0fc6a9f7?lnk=raot
		geoUrl = 'http://maps.google.com/maps/geo?'
				+ '&key='+ googleApiKey
				+ '&q='+ encodeURI(addr)
				+ '&sensor=false&output=json'
				+ '&callback=?';
		//geoUrl = 'http://maps.google.com/maps/geo?callback=?';
		$.ajax({
			type: "GET",
			url: geoUrl,
			dataType: "json",
			//global: false,
			error: function (XMLHttpRequest, textStatus, errorThrown) {
				debug.log("gGeocode() error for "+ geoUrl);
			},
			// complete is only called after success, not on error, therefore useless
			//complete: function (XMLHttpRequest, textStatus) {
  			//	debug.log("gGeocode() complete ", textStatus, XMLHttpRequest);
			//},
			success: function(data, textStatus) {
				//debug.log("gGeocode() success() status,data: ", textStatus, data);
				//$("#"+ cnMFUI.opts.listId ).append('.');
				if (data.Placemark) {
				  callback( {
					lg: data.Placemark[0].Point.coordinates[0],
					lt: data.Placemark[0].Point.coordinates[1],
					addr2: data.Placemark[0].address,
					addr1: data.name
				  });
				} else {
				  callback( {
					// http://code.google.com/apis/maps/documentation/geocoding/index.html#StatusCodes
					addr1: data.name,
					data: data,
					errorCode: data.Status.code,
					tmpError: (data.Status.code == 620) || (data.Status.code == 500) || (data.Status.code == 610),
					error: (data.Status.code) ?
					  ((602==data.Status.code) ? "602: Unknown Address" :
					  ((620==data.Status.code) ? "620: Too Many Lookups" : "Google code: "+data.Status.code)) :
					  "Google geocode api changed"
				  });
				}
			 }
		}); //close $.ajax
	}
	// END GEOCODE


	//
	// BEGIN HELPER FUNCTIONS
	//

	// makeClass - By John Resig (MIT Licensed)
	function makeClass(){
		return function(args){
			if ( this instanceof arguments.callee ) {
				if ( typeof this.init == "function" )
				this.init.apply( this, args.callee ? args : arguments );
			} else {
				return new arguments.callee( arguments );
			}
		};
	}

	//
	// The following date and time routines from fullCalendar
	//
	function zeroPad(n) {
		return (n < 10 ? '0' : '') + n;
	}

	cnMF.rfc3339 = function(d, clearhours) {
		s = d.getUTCFullYear()
			+ "-" + zeroPad(d.getUTCMonth() + 1)
			+ "-" + zeroPad(d.getUTCDate());
		if (clearhours) {
			s += "T00:00:00";
		} else {
			s += "T" + zeroPad(d.getUTCHours())
				+ ":" + zeroPad(d.getUTCMinutes())
				+ ":" + zeroPad(d.getUTCSeconds());
		}
		return s + cnMF.tz.offset; // ex: "-06:00" is chicago offset
	}


	cnMF.monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	cnMF.monthAbbrevs = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	cnMF.dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
	cnMF.dayAbbrevs = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

	cnMF.formatDate = function(d, format) {
		var f = cnMF.dateFormatters;
		var s = '';
		for (var i=0; i<format.length; i++) {
			var c = format.charAt(i);
			if (f[c]) {
				s += f[c](d);
			} else {
				s += c;
			}
		}
		return s;
	}

	cnMF.dateFormatters = {
		'a': function(d) { return d.getHours() < 12 ? 'am' : 'pm' },
		'A': function(d) { return d.getHours() < 12 ? 'AM' : 'PM' },
		'x': function(d) { return d.getHours() < 12 ? 'a' : 'p' },
		'X': function(d) { return d.getHours() < 12 ? 'A' : 'P' },
		'g': function(d) { return d.getHours() % 12 || 12 },
		'G': function(d) { return d.getHours() },
		'h': function(d) { return zeroPad(d.getHours() %12 || 12) },
		'H': function(d) { return zeroPad(d.getHours()) },
		'i': function(d) { return zeroPad(d.getMinutes()) },
		'L': function(d) { return zeroPad(d.getDate()) },
		'D': function(d) { return d.getDate() }, // day of month
		'd': function(d) { return cnMF.dayAbbrevs[d.getDay()] },
		'l': function(d) { return cnMF.dayNames[d.getDay()] },
		'F': function(d) { return cnMF.monthNames[d.getMonth()] },
		'm': function(d) { return zeroPad(d.getMonth() + 1) },
		'M': function(d) { return cnMF.monthAbbrevs[d.getMonth()] },
		'n': function(d) { return d.getMonth() + 1 },
		'Y': function(d) { return d.getFullYear() },
		'y': function(d) { return (d.getFullYear()+'').substring(2) },
		'c': function(d) {
			// ISO8601. derived from http://delete.me.uk/2005/03/iso8601.html
			return d.getUTCFullYear()
				+ "-" + zeroPad(d.getUTCMonth() + 1)
				+ "-" + zeroPad(d.getUTCDate())
				+ "T" + zeroPad(d.getUTCHours())
				+ ":" + zeroPad(d.getUTCMinutes())
				+ ":" + zeroPad(d.getUTCSeconds())
				+ "Z";
		}
	}


	// parseDate() always returns date object, accepts number (msecs)
	//
	cnMF.parseDate = function(s) {
		if (typeof s == 'object') return s; // already a Date object
		if (typeof s == 'undefined') return null;
		if (typeof s == 'number') {
			if (s < 333888111) s = s * 1000; // convert secs to ms
			return new Date(s);
		}
		return cnMF.parseISO8601(s, true)
			|| new Date(Date.parse(s))
			|| new Date(parseInt(s) * 1000);
	}

	cnMF.parseISO8601 = function(s, ignoreTimezone) {
		// derived from http://delete.me.uk/2005/03/iso8601.html
		var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})"
			+ "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?"
			+ "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
		var d = s.match(new RegExp(regexp));
		if (!d) return null;
		var offset = 0;
		var date = new Date(d[1], 0, 1);
		if (d[3]) { date.setMonth(d[3] - 1); }
		if (d[5]) { date.setDate(d[5]); }
		if (d[7]) { date.setHours(d[7]); }
		if (d[8]) { date.setMinutes(d[8]); }
		if (d[10]) { date.setSeconds(d[10]); }
		if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
		if (!ignoreTimezone) {
			if (d[14]) {
				offset = (Number(d[16]) * 60) + Number(d[17]);
				offset *= ((d[15] == '-') ? 1 : -1);
			}
			offset -= date.getTimezoneOffset();
		}
		return new Date(Number(date) + (offset * 60 * 1000));
	}


	// temp helper functions
	cnMF.debugObj = function (myObject) {
		debug.info('TMP === debugObj()',myObject);
		for (name in myObject) {
			var type = 'unknown';
			if (myObject.hasOwnProperty(name) && typeof myObject[name] !== 'function') {
				type='hasOwnProperty1';
			} else if (myObject.hasOwnProperty(name)) {
				type='hasOwnProperty2-'+(typeof myObject[name]);
			}
			debug.info('property name('+name+'): '+type,myObject[name]);
		}
	}

	window.cnMF = cnMF;

})(window);


