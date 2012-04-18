/*
 * cnMapFilterUI
 *
 * User Interface for cnMapFilter, which allows user to
 * View data on a map and list, where the map filters the data,
 * only showing items that have coordinates/address on map's current display.
 *
 * requires cnMapFilter.js and jquery
 *
 * Usage: cnMFUI.init(options)
 *
 * Warning:  This file is very messy, used for prototyping functionality and 
 * for experimenting with coding methods.  I apologize.
 * It will be cleaned up in stages.
 *
 * Copyright (c) 2009-2012 Chad Norwood
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */


;(function($) {

	var startMs2 = (new Date()).getTime();

	// google variables
	var myGmap;
	var gGeocoder;  // TODO: merge with mapfilter.geocoder

	var jScrollPaneInitOpitons = {
		showArrows:true,
		scrollbarWidth: 17, // for winXP style
		maintainPosition:false // this forces it to scroll to top when table is updated
	}; // demo-1.2.3/scrollToSpeed.html


  /*
   * main init function
   */
	function cnMFUI_init (options) {

	cnMFUI.opts = $.extend({}, cnMFUI.defaults, options);

	/*
	 * Variables used by only $().mapFilter()
	 */


	var ndays = cnMFUI.opts.gCalDays;
	var jumptxt = cnMFUI.opts.jumpTxt;
	var mapClickListener = false,
		mapDragstartListener = false,
		lastUpdate4MapLoad = false,
		redrawing = false,
		moreThanOneCal = false,
		emptyTableHtml = "<td>nope</td><td>no match</td><td>uh-uh</td><td>nowhere</td>";

	/*
	 *   static variables
	 */
	var
	urlIconDefault = "http://www.google.com/mapfiles/marker.png",
	urlIconOrange = "http://gmaps-samples.googlecode.com/svn/trunk/markers/orange/blank.png",
	urlIconBlue  = "http://gmaps-samples.googlecode.com/svn/trunk/markers/blue/blank.png",
	mapVersion = "Map Version 2012-4-8";

	cnMF.reportData.loadTime = (startMs2 +'').replace(/(\d{3})$/,".$1") // add period so its secs.msec
	cnMF.reportData.userInteracted = false;

	function init() {

		var timezone = jstz.determine_timezone(); // https://bitbucket.org/pellepim/jstimezonedetect/wiki/Home
		var calendarURLs = getCalendarURLs();
		debug.log('mapfilter().init(), cnMF:',cnMF);
		initDivs();
		myGmap = initGMap();
		//updateSizes();

		// initialize the core MapFilter
		var initObj = {
			// cb = callback functions
			cbBuildInfoHtml : buildInfoHtml,
			cbMapRedraw : mapRedraw,
			cbHighlightItem : cnMFUI.hItem,
			oStartDay : date2days(cnMFUI.opts.startDay),
			oEndDay : date2days(cnMFUI.opts.endDay),
			googleApiKey: cnMFUI.opts.googleApiKey,
			gMap : myGmap
		};
		if (!window.location.href.match(/tz=cal/) && timezone) {
			// if tz=cal is in URL, we use default of calendar timezone. Otherwise use local timezone from browser
			initObj.tzName = timezone.name();
			initObj.tzOffset = timezone.offset();
			initObj.tzDst = timezone.dst();
		}
		cnMF.init(initObj);
		// TODO - move initGMap to cnMF.init(), then do this shortcut: var myGmap = cnMF.gMap;
		debug.log("init cnMF:",cnMF);

		// check for data sources and add them
		//
		if (calendarURLs.length) {
			$('#calendarTitleContent').html("<h3><a href=''>Loading Calendar.. </a></h3>");
			updateStatus('Map Loaded, Loading '+ calendarURLs.length +' Calendar(s) ..');
			//$('#calendarDiv').html('');
			initResults();
			for (var ii = 0; ii < calendarURLs.length; ii++) {
				var gCalURL = calendarURLs[ii];
				// TODO: create a cnMF.showDates(start,end) which gets from google calendar if required
				if (gCalURL == 'test1') {
					fakeGCalData();
				} else if (gCalURL == 'test2') {
					getXmlData();
				} else {
					_gaq.push(['_trackEvent', 'Loading', 'calender-u', gCalURL]);
					cnMF.getGCalData(gCalURL, cnMF.origStartDay, cnMF.origEndDay, {
							onCalendarLoad: cbCalendarLoad,
							onGeoDecodeAddr: cbGeoDecodeAddr,
							onGeoDecodeComplete: cbGeoDecodeComplete
						});
				}
				
			}
		} else {
			updateStatus('Map Loaded.');

			//$('#resultsDiv').html("<div id='resultsDivHelp'>"+ $("#myHelp").html() +"</div>");
			//$('#resultsDivHelp').addClass('scrollPane');
			$('#resultsDiv').html( $("#myHelp").html() );
			updateEventsContainerSize('.helpContainer'); // resize help
			$('.helpContainer').addClass('scrollPane');

			$('#resultsDiv').addClass("winXP"); // to make jScrollpane have a winxp scrollbar - see mapFilter.css
			$('.scrollPane').jScrollPane(jScrollPaneInitOpitons); // add scroll pane
			$('#calendarTitleContent').html( addCalForm() );
		}

		debug.log("mapFilter().init() Completed.");
	  }

	function getCalendarURLs() {
		var calendarURLs = [];
		
		if (cnMFUI.opts.gCalURLs) {
			if (Object.prototype.toString.call(cnMFUI.opts.gCalURLs) != '[object Array]') {
				console.error("gCalURLs must be an array, not "+ typeof cnMFUI.opts.gCalURLs, cnMFUI.opts.gCalURLs);
				return [];
			}
			for (var ii = 0; ii < cnMFUI.opts.gCalURLs.length; ii++) {
				calendarURLs.push(cnMFUI.opts.gCalURLs[ii]);
			}
		}
		if (cnMFUI.opts.gCalGroups) { // gcg=xxx,yyy
			$.each(cnMFUI.opts.gCalGroups.split(','), function(index, value) { 
				calendarURLs.push("https://www.google.com/calendar/feeds/"+ value + "%40group.calendar.google.com/public/basic");
			});
		}
		if (cnMFUI.opts.gCalImports) { // gci=xxx,yyy
			$.each(cnMFUI.opts.gCalImports.split(','), function(index, value) { 
				calendarURLs.push("https://www.google.com/calendar/feeds/"+ value + "%40import.calendar.google.com/public/basic");
			});
		}
		if (cnMFUI.opts.gCalEmails) { // gc=xxx@groups.calendar.google.com,yyy@my.domain.com
			$.each(cnMFUI.opts.gCalEmails.split(','), function(index, value) { 
				calendarURLs.push("https://www.google.com/calendar/feeds/"+ value + "/public/basic");
			});
		}
		moreThanOneCal = calendarURLs.length > 1;
		return calendarURLs;
	}
	function initDivs() {

		// this html does not belong in javascript, but keeping here to aid in prototype development
	  	$('#'+cnMFUI.opts.containerId).html(
			  '<div id="gcmDiv" class="ui-widget-content">'
			+ '  <div class="content" id="MapID"></div>'
			+ '  <div id="rtSide" class="ui-state-active">'
			+ '	<div id="titleDiv">'
			+ '	  <div id="calendarTitle"><div id="calendarTitleContent"></div></div>'
			+ '	  <div id="gcmLogo"></div>'
			+ '	</div>'
			+ '	<div id="resultsDiv">'
			+ '	  <div id="resultsData">'
			+ '		<div id="resultsDataFilters"></div>'
			+ '		<div id="resultsDataStatus"></div>'
			+ '	  </div>'
			+ '	  <div id="ResultsMapHdr"></div>'
			+ '	  <div id="ResultsMapEvents"></div>'
			+ '	  <div id="ResultsMapUnknown"></div>'
			+ '	</div>'
			+ '  </div>'
			+ '</div>');

		$('#gcmLogo').html("<h1><a href='http://chadnorwood.com/projects/gcm/' class='jumpLink' target='_blank' title='Click to view Google Calendar Map homepage in new window'>GCM</a></h1>");
		// need to init resultsDiv and put MapStatus under resultsDataStatus
		$('#resultsDataStatus').html("<div id='MapStatus'>.. Loading Map ..</div><div id='MapStatus2'></div>");

		// need to redo how we deal with inital help screen.  Should switch between 2 main divs (help vs content), one is display:none
		//$('#resultsDiv').html( $("#myHelp").html() );

	  }


	  function logDimensions(s) {
	  	h = $(s).height();
	  	ih = $(s).innerHeight();
	  	oh = $(s).outerHeight(true);
	  	w = $(s).width();
	  	iw = $(s).innerWidth();
	  	ow = $(s).outerWidth(true);
		debug.log('dimensions of selector('+s+') '
			+'w x h: '+w+'x'+h+', '
			+'inner: '+iw+'x'+ih+', '
			+'outer: '+ow+'x'+oh
		);
	  }
	  function addCalForm() {
	  	return  "<form action='"+window.location.pathname+"' method='get' id='xmlForm'><p>\n"
			  + "<span><input id='xmlurl' name='u' value='http://' size='25' class='required' minlength='2' /></span>"
			  + "<span><input type='submit' id='asubmit' value='Add Cal'></span>\n"
			  + "</form>";
	  }


	  function initGMap() {

		updateStatus('Loading Google Map');

		if (!GBrowserIsCompatible()) {
		   document.getElementById(cnMFUI.opts.mapId).innerHTML = unSupportedHtml;
		   return;
		}
		var myGmap = new GMap2(document.getElementById(cnMFUI.opts.mapId));
		myGmap.setUIToDefault();
		myGmap.setCenter(new GLatLng(cnMFUI.opts.mapCenterLt, cnMFUI.opts.mapCenterLg), cnMFUI.opts.mapZoom, myGmap.getMapTypes()[cnMFUI.opts.mapType]);
		gGeocoder = new GClientGeocoder();
		GEvent.addListener(myGmap, 'moveend', function(){
			mapMovedListener();
		});
		mapClickListener = GEvent.addListener(myGmap, 'click', function(){
			// handles click and double-clicks, but not click-and-drag
			cbUserInteracted(); 
		});
		mapDragstartListener = GEvent.addListener(myGmap, 'dragstart', function(){
			// handles click-and-drag
			cbUserInteracted(); 
		});
		mapLogo(myGmap);
		mapJumpBox(myGmap);
		mapRightTab(cnMFUI.opts.mapId);
		iconDefault = new GIcon(G_DEFAULT_ICON, urlIconDefault);
		return myGmap;
	  }


	  function initSlider(sliderParentId) {

		var elemId = 'sliders';
	  	$("#"+sliderParentId).html('<div id="'+elemId+'"></div>');
		resizeSlider(elemId); // resize date sliders

		var sliderId = elemId + "Slider";
		var sHandleTxt = 'title="Click and drag to instantly filter by dates"';

	  	html = '<br clear="all"><div id="'+sliderId+'" class="slider myslider ui-slider ui-slider-horizontal ui-widget ui-widget-content ui-corner-all">'
		  + '<div id="'+sliderId+'1" '+sHandleTxt+' class="jumpLink my_slider_handle ui-slider-handle ui-state-default ui-corner-all" style="left: 0%;" ></div>'
		  + '<div id="'+sliderId+'2" '+sHandleTxt+' class="jumpLink my_slider_handle ui-slider-handle ui-state-default ui-corner-all" style="left: 100%;"></div>'
		  //+ '<div style="left: 19%; width: 81%;" class="ui-slider-range ui-widget-header"></div>'
		  + '</div><br clear="all"><span style="display:none">Show events from: <span id="'+sliderId+'Start"></span> - <span id="'+sliderId+'End"></span></span>';

		$("#"+elemId).append(html);

		// chad hates that slider handles can overlap, but fixed: http://chadnorwood.com/code/slider-fix.html
		// http://dev.jqueryui.com/ticket/3467
		// example of not overlapping - kayak - and mootools
		// http://developer.expressionz.in/downloads/mootools_double_pinned_slider_with_clipped_gutter_image_v2.2/slider_using_mootols_1.2.html
		$('#'+sliderId).sliderChad( {
			range:true,
			min: cnMF.origStartDay,
			max: cnMF.origEndDay,
			values: [cnMF.origStartDay, cnMF.origEndDay],
			step: 1,
			slide:function(n,j) {
				//console.log('sliderChad() callback ' );
				$('#'+ sliderId+'1').html(sliderDate(j.values[0]));
				$('#'+ sliderId+'2').html(sliderDate(j.values[1]));
				//$('#'+ sliderId+'2').text(j.values[1]);
				//$('#'+ sliderId+'Start').text( sliderDate(j.values[0]) );
				//$('#'+ sliderId+'End'  ).text( sliderDate(j.values[1]) )
			},
			// change is stop + updated from values call in updateSlider
			// http://jqueryui.com/demos/slider/#event-slide
			change:function(n,j){
				debug.log('initSlider() callback - changed start,stop: ', j.values[0], j.values[1] );
				cnMF.showDays(j.values[0], j.values[1]);
				//updateResults();
			}
		});
		$('#'+ sliderId+'1').html(sliderDate(cnMF.origStartDay));
		$('#'+ sliderId+'2').html(sliderDate(cnMF.origEndDay));
		/*
		$('#'+ sliderId+'Start').text( sliderDate(cnMF.origStartDay) );
		$('#'+ sliderId+'End'  ).text( sliderDate(cnMF.origEndDay) );
		*/
	  }

	  function resizeSlider(elemId) {
		var sliderId = elemId; // + "Slider";
		var sWidth = $('#rtSide').width() - $('#resultsDataStatus').width() - 10;
		debug.log('resizeSlider():'+sWidth);
		$('#'+sliderId).css({ 'width': sWidth });
		$('.ui-slider-horizontal').css({ 'width': sWidth - 10 });

	  }

	  function resetStartEndDays(elemId){
		cnMF.curStartDay = cnMF.origStartDay;
		cnMF.curEndDay = cnMF.origEndDay;
		updateSlider(elemId);
	  }

	  function updateSlider(elemId){
  		debug.log('******** updateSlider('+elemId+') '+cnMF.curStartDay, cnMF.curEndDay, cnMF);

		sliderId = elemId + "Slider";
		$('#'+sliderId).sliderChad("option", "values", [cnMF.curStartDay,cnMF.curEndDay]);
  		debug.log('******** updateSlider('+elemId+') VALUES UPDATED ');
		$('#'+ sliderId+'1').html(sliderDate(cnMF.curStartDay));
		$('#'+ sliderId+'2').html(sliderDate(cnMF.curEndDay));
  		debug.log('******** updateSlider('+elemId+') COMPLETE ');
	  }

	  function date2days(date) {
	 	date = date + '';
	 	if (date.length < 6) {
	 		// assume its days offset
	 		//debug.log('******** date2days('+date+') GOOD !!!!!!!!!!!! !!!!');
	 		return 1 * date; // return number
	 	}
	 	// we just support these YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD, and YYYYMMDD, like 2010/02/12, 2010-02-12, 20100212
	 	var fields = date.match(/(\d{4})([\/\.-])(\d\d?)\2(\d\d?)/);
	 	if (null == fields) {
	 		fields = date.match(/(\d{4})()(\d\d)(\d\d)/);
	 	}
	 	if (fields) {
	 		//debug.log('******** date2days match:', fields[1], fields[3], fields[4]);
	 		//var dateObj = new Date(fields[1], fields[2], fields[3]); //Month is 0-11 in JavaScript
	 		var dateObj = new Date();
	 		dateObj.setFullYear(1*fields[1]);
	 		dateObj.setMonth((1*fields[3])-1);
	 		dateObj.setDate(1*fields[4]);
	 		var now = new Date();
	 		msDiff = dateObj.getTime() - now.getTime();
	 		return Math.round(msDiff / (24*3600*1000));
	 	}
	 	debug.log('******** date2days('+date+') invalid date format !!!!!!!!!!!! TODO !!!!');
	 	return 0;
	  }

	  function days2date(nDays) {
		var day = new Date();
		day.setTime(day.getTime() + nDays*24*3600*1000);
  		debug.log('******** days2date('+nDays+') '+ cnMF.formatDate(day, 'Y-m-L'));
	  	return cnMF.formatDate(day, 'Y-m-L');
	  }
	  function sliderDate(nDays) {
		var day = new Date();
		day.setTime(day.getTime() + nDays*24*3600*1000); //expires in ndays days (milliseconds)
	  	return cnMF.formatDate(day, 'n-D') +'<br>'+cnMF.formatDate(day, 'd');
	  }


	  function initResults(){

	  	initSlider('resultsDataFilters');

		resultsHtml = "<div id='ResultsMapHdrTitle'>"
			//+ " <br clear='all'>"
			+ "Map Showing The Following <span id='ResultsMapHdrNum'></span> Events"
	  		+ " &nbsp; <a href='javascript:void(0)' class='actionable' id='ResultsMapHdrWarning'>Warning: [<span></span>]</a>"
	  		+ "</div><div id='ResultsMapHdrFilters'>"
			+ "<a id='ResultsMapHdrFilterFrozen' class='actionable' title='Click To Close Info Window on Map.  Events listed below will not change while Info Window is open.'>[x] Info Window Open</a> &nbsp;"
			+ "<a id='ResultsMapHdrFilterByMap' class='actionable' title='Click to show all events - will move and zoom map'>[x] Filtered by MAP</a> &nbsp;"
			+ "<a id='ResultsMapHdrFilterByDate' class='actionable' title='Click to show all events - will move date sliders'>[x] Filtered by Date</a> &nbsp;"
			+"</div>";
	  	$("#ResultsMapHdr").html(resultsHtml);
		$("#ResultsMapHdrFilterFrozen").css('display','none');


		$("#ResultsMapHdrFilterByMap").click(function(){
			debug.warn('------ ResultsMapHdrFilterByMap clicked');
			   _gaq.push(['_trackEvent', 'Interaction', 'ResultsMapHdrFilterByMap']);
			cnMF.mapAllEvents();
			debug.warn('------ ResultsMapHdrFilterByMap clicked');

		});
		$("#ResultsMapHdrFilterByDate").click(function(){
			   _gaq.push(['_trackEvent', 'Interaction', 'ResultsMapHdrFilterByDate']);
			resetStartEndDays('sliders');
			//mapAllEvents();
		});
		$("#ResultsMapHdrFilterFrozen").click(function(){
			// on the map, close a marker's info window
			myGmap.closeInfoWindow();
			   _gaq.push(['_trackEvent', 'Interaction', 'ResultsMapHdrFilterFrozen']);
			//$("#ResultsMapHdrFilterFrozen").css('display','none');
		});

		// need to addListener to fire when infowindow is closed
		GEvent.addListener(myGmap, "infowindowclose", function() {
			   _gaq.push(['_trackEvent', 'Interaction', 'gMrkr', 'infowindowclose']);
	  		debug.log('infowindowclose event fired, redrawing map');
			//$('#ResultsMapHdrFilterFrozen').css('display','none');
			mapRedraw();
		});


		$("#ResultsMapUnknown").html('<div id="ResultsMapUnknownHdr"></div><div id="ResultsMapUnknownTable"></div>');
		$("#ResultsMapUnknownHdr").html('The Following Events Had Addresses (Where) That Could Not Be Found. &nbsp; See FAQ');

		var dialogUnknowns = $("#ResultsMapUnknown").dialog({
	  		bgiframe: true, autoOpen: false, resizable: true,
			modal: true
		});
	  	$("#ResultsMapHdrWarning").click(function(){
			_gaq.push(['_trackEvent', 'Interaction', 'ResultsMapHdrWarning']);
			dialogUnknowns.dialog('open');
	  	});

		$.tablesorter.defaults.sortList = [[0,0]];
		$.tablesorter.defaults.widthFixed = true;
		createResultsTable('ResultsMapEvents', true);
		createResultsTable('ResultsMapUnknownTable', false);

		updateEventsContainerSize('#ResultsMapEventsTable');
		$('#ResultsMapEventsTable').addClass("scrollPane");
		$('#ResultsMapEvents').addClass("winXP"); // to make jScrollpane have a winxp scrollbar - see mapFilter.css

		updateResults();

		//$('#ResultsMapEvents').css({'height':'auto','overflow':'visible'});

		$(window).resize(function(){
	  		debug.log('windowResizing, new WxH: '+$(window).width()+"x"+$(window).height());

			if ((typeof windowResizing == 'boolean') && windowResizing) {
		  		debug.log('windowResizing too fast !!');
				return;
			}
			windowResizing=true;
			setTimeout( function() {
				windowResizedListener();
				windowResizing=false;
			}, 200);
		});
	  }

	  function windowResizedListener() {
	  		debug.log('windowResizedListener, new WxH: '+$(window).width()+"x"+$(window).height());

		  	initSlider('resultsDataFilters'); // resize then redraw sliders

			// clear table and remove scroll pane in order to resize it properly
			$('.scrollPane').jScrollPaneRemove();
			updateResultsTable('ResultsMapEvents', true, true); // clear table
			updateEventsContainerSize('#ResultsMapEventsTable'); // resize table
			$('.scrollPane').jScrollPane(jScrollPaneInitOpitons); // add scroll pane

			// since we cleared table, need repopulate it, too.
			//updateResultsTable('ResultsMapEvents', true, false);
			updateResults();

			// check to see if we need to add/delete markers
			mapRedraw();
	  }

	  function updateEventsContainerSize(eventsContainerSelector) {
	  	if ((typeof updating == 'boolean') && updating) {
			debug.log(ems+"updateEventsContainerSize() in process, skipping.");
			return;
		}
		updating=true;

		// we want rtSide height to be same as window height, not go over
		otherHeight = $('#titleDiv').height() + $('#resultsData').height() + $('#ResultsMapHdr').height();

		eventsContainerHeight = $(window).height() - 32 - otherHeight;
		eventsContainerWidth = $('#rtSide').width() - 10;
		debug.log('updateEventsContainerSize('+eventsContainerSelector+') eventsContainerHeight:'+eventsContainerHeight+', eventsContainerWidth:'+eventsContainerWidth);
		$(eventsContainerSelector).css({
			'height': eventsContainerHeight,
			'width': eventsContainerWidth
		});

		updating=false;
	  }

	  function updateResults() {
	  	$("#ResultsMapHdrNum").html(cnMF.numDisplayed);
		//ht=$("#ResultsMapHdrNum").html();
	  	//debug.log('updateResults() cnMF.numDisplayed:', ht, cnMF.

		if (cnMF.countUnknownAddresses() > 0) {
			$("#ResultsMapHdrWarning span").html(cnMF.countUnknownAddresses());
			$("#ResultsMapHdrWarning").css('display','inline');  // display: block
		} else {
			$("#ResultsMapHdrWarning").css('display','none'); // none: hide warning if no unknown addr
		}
		updateFilters();
		updateResultsTable('ResultsMapEvents', true, false);
		updateResultsTable('ResultsMapUnknownTable', false, false);

		try {
			$('.scrollPane').jScrollPane(jScrollPaneInitOpitons);
		} catch (e) {
			debug.log('jScrollPane error:', e.message);
		}
	  }

	  /*
	   * updateFilters() handles 2 filters:
	   * (1) if not showing all events, show "Filtered by MAP"
	   * (2) when infowindow is open, don't redraw map, don't update results, don't display "Filtered by MAP"
	   */
	  function updateFilters() {
		if (cnMF.filteredByDate) {
			$("#ResultsMapHdrFilterByDate").css('display','inline');
			debug.log('cnMF.filteredByDate is true: ', cnMF.filteredByDate);
		} else {
			$("#ResultsMapHdrFilterByDate").css('display','none');
			debug.log('cnMF.filteredByDate is false: ', cnMF.filteredByDate);
		}
		if (!myGmap.getInfoWindow().isHidden()) {
			$("#ResultsMapHdrFilterByMap").css('display','none');
			$("#ResultsMapHdrFilterFrozen").css('display','inline');
				debug.log('getInfoWindow is showing');
		} else {
			$("#ResultsMapHdrFilterFrozen").css('display','none');
			if (cnMF.filteredByMap) {
			//if (cnMF.numDisplayed == cnMF.countKnownAddresses())
				debug.log('cnMF.filteredByMap is true: ', cnMF.filteredByMap);
				$("#ResultsMapHdrFilterByMap").css('display','inline');
			} else {
				debug.log('cnMF.filteredByMap is false: ', cnMF.filteredByMap);
				$("#ResultsMapHdrFilterByMap").css('display','none');
			}
		}

	  }

	  function createResultsTable(divId, onlyValidCoords){
	  	debug.warn("createResultsTable() ", divId, onlyValidCoords);

		// note: give table dummy tbody data or tablesorter gives "parsers is undefined" error
	  	tableHtml = "<table id='"+divId+"Table' class='tablesorter'><thead><tr>"
				+ "<th id='thDate' title='Click to Sort by Event Date, timezone "+cnMF.tz.name+"'>Date</th>"
				+ "<th title='Click to Sort by Event Name'>Name</th>"
				+ "<th title='Click to Sort by Event Description'>Description</th>"
				+ "<th title='Click to Sort by Event Location'>Where</th>"
	  			+ "</tr></thead><tbody><tr>"+emptyTableHtml+"</tr></tbody></table>";
		pagerHtml = "<div id='"+divId+"Pager'>"+$("#pager").html()+"</div>";
		pagerHtml = '';
	  	$('#' + divId).html(tableHtml+pagerHtml);

		//$('#' + divId +"Pager .pagesize").val(cnMFUI.opts.numTableRows); // rows in table
		$("#" + divId + "Table").tablesorter()
		/*
		  .tablesorterPager({
		  		seperator: " of ",
				positionFixed: false, // TODO: set to true, move pager to top of table
				container: $("#"+divId+"Pager")
			})
		*/
		  .bind("sortEnd",function() {
			debug.log('tablesorter finished sorting', this);
			})
		  ;

	  }

	  function updateResultsTable(divId, onlyValidCoords, clearTable){
		var rowHTML = '';
	  	for (var i in cnMF.eventList) {
			if (clearTable)
				continue;
	  		var kk = cnMF.eventList[i];
	  		if (onlyValidCoords && !kk.isDisplayed)
	  			continue;
	  		if (!onlyValidCoords && kk.validCoords)
	  			continue;

	  		rowHTML += "<tr>";
			rowHTML += "<td>" + cnMF.formatDate(kk.dateStart, 'Y-m-L d H:i') + "</td>";
			//rowHTML += "<td>" + cnMF.formatDate(kk.dateStart, 'm/D  g:i a d') + "</td>";
	  		// TODO: use this and/or custom sort http://tablesorter.com/docs/example-meta-parsers.html
			// rowHTML += "<td>" + cnMF.formatDate(kk.dateStart, 'm/D d g:ia') + "</td>";


	  		rowHTML += onlyValidCoords ? '<td><a class="eventNameTrigger actionable" onclick="cnMFUI.hItem(' + kk.id + ')"  title="Click to show marker on map" href="javascript:void(0)" style="display:block">'
					+ cnMFUI.htmlEncode(cnMFUI.maxStr(kk.name, 100, 0, '', 1)) + "</a></td>"
				: '<td>'+ cnMFUI.htmlEncode(cnMFUI.maxStr(kk.name, 100, 0, '', 1)) + '</td>';

	  		rowHTML += "<td>[<a href='" + kk.url + "' class='jumpLink' title='Click to view Calendar Event Web Page in new window' target='_blank'>Event Details</a>] "
					+ cnMFUI.htmlEncode(cnMFUI.maxStr(kk.desc, 140, 0, '', 1)) + "</td>";

	  		rowHTML += onlyValidCoords ? '<td>' + kk.addrFromGoogle + ' (<a class="actionable" href="javascript:void(0)" title="' 
					+ cnMFUI.htmlEncode(cnMFUI.maxStr(kk.addrOrig, 100, 0, '', 0)) + '">orig</a>)</td>'
				: '<td>'+(kk.addrOrig.match(/\w/) ? kk.addrOrig : '[empty]' )
				  +'<br><a href="' + kk.url + '" title="Click to edit this event (if you have permission) in a new window" target="_blank">Edit Event Address</a><br>Error: ' + kk.error + '</td>';
	  		rowHTML += "</tr>\n";
	  	}

		// empty tbody triggers "parsers is undefined" error from tablesorter
		if (rowHTML == '') {
			rowHTML = '<tr>'+emptyTableHtml+ '</tr>';
		  	$("#" + divId + "Table tbody").html(rowHTML);
			return;
		}
	  	$("#" + divId + "Table tbody").html(rowHTML);

		// trigger tablesorter to sort
	  	$("#" + divId + "Table").trigger("update");
		var sorting = [[0,0]]; // sort on the first column
		$("#" + divId + "Table").trigger("sorton",[sorting]);

	  	// trigger update of pagedisplay
		//$('#' + divId +"Pager .pagesize").val(cnMFUI.opts.numTableRows+1).val(cnMFUI.opts.numTableRows);


	  }


 	 /* TODO: if event is an all day event, represent that instead of currently saying 12a-12am
		 * TODO: also note recurring (weekly/monthly/etc)
*/

	  function getMapType(oMap) {
		mm = oMap.getMapTypes().length;
		for (nn = 0; nn < mm; nn++){
		  if (oMap.getMapTypes()[nn] == oMap.getCurrentMapType())
			return nn;
		}
		return -1;
	  }




	  function mapRedraw(skipUpdateStatus) {

		if ((typeof redrawing == 'boolean') && redrawing) {
			debug.log(ems+" mapRedraw() redrawing already in process, skipping.");
			return;
		}
		redrawing=true;
		// debug.time('total mapRedraw');

		if (cnMF.updateMarkers()) {
		  debug.log("mapRedraw() updated markers, changes found");
		  if (!skipUpdateStatus) updateStatus("... Redrawing Map ...");
		  updateResults();
		} else {
		  debug.log("mapRedraw() updated markers - no changes, no updateResults()");
		  updateFilters();
		}
		// debug.timeEnd('total mapRedraw');


		// todo: don't update status every map redraw. then we can call mapRedraw during geocoding, but
		// will need to change maplink
		//if (!skipUpdateStatus) updateStatus("<a title='Link to Full Calendar' href='"+ gcLink +"'>"+ gcTitle +"</a>");
		if (!skipUpdateStatus) updateStatus('');

		//sleep(2000);
		mapChanged();
		//updateSizes();
		redrawing=false;
	  }


	  // TODO - chad - move to index.html as callback function
	  function mapChanged() {
		if (cnMFUI.opts.mapChangeCallback) cnMFUI.opts.mapChangeCallback({
		  mapZoom: myGmap.getZoom(),
		  mapType: getMapType(myGmap),
		  mapCenterLt: myGmap.getCenter().lat().toString().replace(/(\.\d\d\d\d\d\d)\d+/,"$1"),
		  mapCenterLg: myGmap.getCenter().lng().toString().replace(/(\.\d\d\d\d\d\d)\d+/,"$1"),
		  startDay: cnMF.curStartDay,
		  endDay: cnMF.curEndDay
		});
	  }


	  function mapMovedListener() {

		  if (!myGmap.getInfoWindow().isHidden()) {
			  debug.log("mapMovedListener(): infowindow is open, not redrawing.");
			  return;
		  }
		  debug.log("mapMovedListener(): redrawing ...");
		  mapRedraw();
			//debug.log("sleeping for 2secs");
			//sleep(2000);
			//debug.log("woke up !!");
	  }



	  // Insert Jump Box (aka goto address)
	  function mapJumpBox(oMap) {

		var info=document.createElement('div');
		//info.id='SearchBox';
		info.style.position='absolute';
		info.style.right='7px';
		info.style.top='42px';
		//info.style.backgroundColor='transparent';
		info.style.zIndex=10; // TODO: find proper zIndex - less than infowindow, but greater than map
		//info.innerHTML='<input id="gotoBox" type="text" size=35 onkeypress="handleKeyPress(event,\'#goToAddress\')" value ="'+jumptxt+'" onfocus="if (this.value == \''+jumptxt+'\') {this.value = \'\';}" onblur="if (this.value == \'\') {this.value = \''+jumptxt+'\';}" />';
		info.innerHTML = '<form action="#" onsubmit="cnMFUI.jumpToAddress(this.address.value); return false">'
			+ '<input id="jumpBox" type="text" size=27 name="address" value ="' + jumptxt
			+ '" onfocus="if (this.value == \''+ jumptxt +'\') {this.value = \'\';}" onblur="if '
			+ '(this.value == \'\') {this.value = \''+ jumptxt +'\';}" /></form>';

		oMap.getContainer().appendChild(info);
	  }

	
	function mapRightTab(mapId) {
		$('#'+mapId).append("<div id='rightTab'>-</div>");
		$('#rightTab').click(function(){
			console.log("mapRightTab() rtSide').width: ",$('#rtSide').width());
			if ($('#rtSide').width() < 1) {
				$('#rightTab').html('-');
				$('#MapID').css('width','67%');
				$('#rtSide').animate({
					width : '32%'
				}, 400	, 'linear');
			} else {
				$('#rightTab').html('+');
				$('#rtSide').animate({
					width : 0
				}, 400, 'linear', function(){
					$('#MapID').css('width','100%');
				});
				
			}
		});
	}
	
	function mapLogo(oMap) {
		/* Insert Logo on Map */
		var info=document.createElement('div');
		info.id='LogoInfo';
		info.style.position='absolute';
		info.style.right='4px';
		info.style.bottom='20px';
		info.style.backgroundColor='transparent';
		info.style.zIndex=25500;
		info.innerHTML='<a href="http://chadnorwood.com/" title="Powered by Craft Beer"><img src="http://chadnorwood.com/beermug.ico" style="border:0; margin: 2px;"/></a>';

		oMap.getContainer().appendChild(info);
	  }


	  function addLinks (txt) {
		  return txt.replace(/(http:\/\/[^<>\s]+)/gi,'<a href="$1">$1</a>');
	  }


	  function buildInfoHtml (kk) {
		  if (kk.infoHtml) return;
		  //str = i+" id("+kk['id']+"): "+kk['n']+"\n"+ kk['lt'] +", "+ kk['lg'] ;
		  //alert(str);
		  //desc = "Star(s): "+ kk['r'] +" &nbsp; Category: "+ rawJson[0][kk['c']] + "<p>\n" + kk['d'];
		  //infoHTML = "<div class=\"IW\"><h1>"+ kk['n'] +"<\/h1><div id=\"IWContent\">"+ desc +"</div>"+footer+"</div>";

		  kk.infoHtml = "<div class='IW'><h1>"+ kk.name +"<\/h1>";
		  kk.infoHtml += moreThanOneCal ? '<h3>Calendar: '+kk.calTitle+'</h3>' : '';
		  kk.infoHtml += "<div id='IWContent' class='preWrapped'>"+ cnMFUI.maxStr( addLinks(kk.desc), 900, 26, kk.url) +"</div>";
		  kk.infoHtml += '<div id="IWZoom">';
		  kk.infoHtml += cnMF.formatDate(kk.dateStart, 'F D, l gx') +"-"+ cnMF.formatDate(kk.dateEnd, 'gx') +"<br>";
		  kk.infoHtml += '<a href="javascript:void(0)" onclick="cnMFUI.zoomTo('+ kk.id +')">Zoom To</a> - ';
		  kk.infoHtml += kk.addrOrig +" - " + kk.getDirectionsHtmlStr();
		  kk.infoHtml += '</div></div>';
	  }


	  function updateStatus(msg) {
	  	$("#MapStatus").html(msg);
		debug.log("updateStatus(): "+msg);
	  }

	  function updateStatus2(msg) {
	  	$("#MapStatus2").html(msg);
		debug.log("updateStatus2(): "+msg);
	  }





	  // TODO: remove this?
	  function getXmlData () {
		// jsoncallback=?
		xmlUrl = 'http://feeds2.feedburner.com/torontoevents?format=xml&jsoncallback=?';
		if (xmlUrl.search(/^(http|feed)/i) < 0) {
		  debug.log("getXmlData(): bad url: "+ gCalUrl);
		  return;
		}
		$.ajax({
			type: "GET",
			url: xmlUrl,
			dataType: "xml",
			dataType: "json",
			global: false,
			processData: false,
			dataFilter: function(xml) {
				debug.log("xml2 data: %o", xml);
			},
			success: function(xml) {
				debug.log("xml3 data: %o", xml);
/*
				$(xml).find('label').each(function(){
					 var id_text = $(this).attr('id')
					 var name_text = $(this).find('name').text()

					 $('<li></li>')
						 .html(name_text + ' (' + id_text + ')')
						 .appendTo('#update-target ol');
				 }); //close each(
*/
			 }
		}); //close $.ajax

		return;
	  }


	  function fakeGCalData () {
		  debug.log("fakeGCalData() init");
		  cnMF.addEventType({
			title: 'Test1',
			titleLink: ''
		  });

		  //mapRedraw(); return;

		  days = 6;
		  now = new Date();
		  times = 3;
		  while (times--) {
		  	for (var ii in fakeMarkersList) {
		  		kk = cnMF.addEvent(fakeMarkersList[ii]);
		  		kk.validCoords = true;
		  		kk.dateStart = cnMF.parseDate(now.getTime() + Math.floor(Math.random() * days * 24 * 3600 * 1000));
		  		kk.dateEnd = cnMF.parseDate(kk.dateStart.getTime() + 2 * 3600 * 1000);
		  		//debug.log("fakeGCalData() changed start/end: ", kk);
		  	}
		  }
		  debug.log("fakeGCalData() using fake calendar data: ", cnMF);
		  mapRedraw();
	  }
/*
 * TODO: Performance
 * build dom fragment then insert: http://ejohn.org/blog/dom-documentfragments/
 */


	  function setupChangeDates() {
		  var html = ''
		  	 + 'New start date: <input type="text" id="startDate" size="10" value="'+days2date(cnMF.origStartDay)+'"> &nbsp;'
			 + 'New end date: <input type="text" id="endDate" size="10" value="'+days2date(cnMF.origEndDay)+'"> '
		  	 + '<p>Reloading will fetch all calendar event data between start and end date, then reload GCM.  This is needed if you want to expand the date range.'
		  	 + ' However, if you just want a shorter date range, use the date sliders to instantly filter events.</p>'
			 + '<p><a href="#" id="reloadPage" class="actionable">Reload</a></p>'
			 + '<p><a href="#" id="cancelReloadPage" class="actionable">Cancel</a></p>';
		  $('#newDates').html(html);

		  	var dialogDates = $("#newDates").dialog({
				//bgiframe: true,
				autoOpen: false, resizable: true,
				position: ['center','center'],
				width: 600, height: 380,
				modal: true
			});
			dialogDates.dialog('open');
			var dateFormatStr = "%Y-%m-%d"; // must match date format in days2date
			new JsDatePick({
				target:"startDate",
				useMode:2,
				dateFormat:dateFormatStr
				});
			new JsDatePick({
				target:"endDate",
				useMode:2,
				dateFormat:dateFormatStr
				});
		  $('#cancelReloadPage').click(function(){
			_gaq.push(['_trackEvent', 'Interaction', 'cancelReloadPage']);
			 $("#newDates").dialog('close');
		  });
		  $('#reloadPage').click(function(){
			var sd =  $("#startDate").val().replace(/\//, '-');
			var ed =  $("#endDate").val().replace(/\//, '-');
			var url = window.location.href;
			if (window.location.search.match(/sd=\d+/)) {
				url = url.replace(/sd=[\d\-]+/,'sd='+sd).replace(/ed=[\d\-]+/,'ed='+ed);
			} else {
			 	url = url.replace(/u=/,'sd='+sd+'&ed='+ed+'&u=');
			}
	  		debug.log("reloadPage new url: ", url);
		  _gaq.push(['_trackEvent', 'Interaction', 'reloadPage', url]);
			alert('going to url: '+url);
			window.location = url;
			//$("#newDates").dialog('close');
			//getGCalData(cnMFUI.opts.gCalUrl, date2days( $("#startDate").val()), date2days( $("#endDate").val()));
		  });
	  }

		/*
		calendarInfo.gCalUrl = gCalUrl;
		calendarInfo.totalEntries = ii;
		calendarInfo.totalEvents = cdata.feed.openSearch$totalResults.$t || ii;		
		calendarInfo.gcTitle = cdata.feed.title ? cdata.feed.title['$t'] : 'title unknown';
		calendarInfo.gcLink = cdata.feed.link ? cdata.feed.link[0]['href'] : '';
		calendarInfo.desc = cdata.feed.subtitle ? cdata.feed.subtitle['$t'] : 'subtitle unknown';
		*/

	function cbCalendarLoad(calendarInfo) {
		var html,
		    titles = [],
		    totalEvents = 0;
		
		cnMF.calData = cnMF.calData || {};
		cnMF.calData[calendarInfo.gCalUrl] = calendarInfo;
		
		$.each(cnMF.calData, function(gCalUrl, calendarInfo) {
			totalEvents += calendarInfo.totalEvents;
			titles.push(calendarInfo.gcTitle);
		});
		
		// check to see if we are processing more than one calendar or not.
		if (cnMF.validCalendars) {
			cnMF.validCalendars++;
			document.title = "GCM "+ cnMF.validCalendars + " valid calendars";
			
			updateStatus("<a title='Click to view Full Calendar' class='actionable' href='"+ calendarInfo.gcLink +"'>"
				+ calendarInfo.gcTitle +"</a><br>Mapping Events ... ");
				
			$('#calendarTitleContent').html('<h3><a title="'+ titles.join(" -- ") + '"'
				+' class="jumpLink" target="_blank" href="">Showing '+ cnMF.validCalendars +' Valid Calendars</a></h3>'
				+' <span>'+ cnMF.validCalendars +' Calendars have '+ totalEvents
				+' events <nobr>from '+ cnMF.formatDate(startDate, 'Y-n-D') +'</nobr>'
				+' <nobr>to '+ cnMF.formatDate(endDate, 'Y-n-D')  +'</nobr>'
				+' &nbsp; <nobr><a id="changeDates" class="actionable" href="#" title='
				+'"Click to choose new start and end dates and reload page">Change dates</a></nobr>'
				+ '</span><div id="newDates"></div>');
		} else {
			cnMF.validCalendars = 1;
			document.title = "GCM - "+ calendarInfo.gcTitle;

			updateStatus("<a title='Click to view Full Calendar' class='actionable' href='"+ calendarInfo.gcLink +"'>"
				+ calendarInfo.gcTitle +"</a><br>Mapping Events ... ");

			$('#calendarTitleContent').html("<h3><a title='"+calendarInfo.desc+" - Click to view calendar in new window' "
				+"class='jumpLink' target='_blank' href='"+ calendarInfo.gcLink +"'>"+ calendarInfo.gcTitle +"</a></h3>"
				+ '<span>Calendar has '+ calendarInfo.totalEvents + (calendarInfo.totalEvents==calendarInfo.totalEntries ? ''
					:' (<span class="titleDesc" title="Counted '+calendarInfo.totalEntries+' entries even though feed said '
					+calendarInfo.totalEvents+' total">'+calendarInfo.totalEntries+'</span>)')
				+' events <nobr>from '+ cnMF.formatDate(startDate, 'Y-n-D') +'</nobr>'
				+' <nobr>to '+ cnMF.formatDate(endDate, 'Y-n-D')  +'</nobr>'
				+' &nbsp; <nobr><a id="changeDates" class="actionable" href="#" title='
				+'"Click to choose new start and end dates and reload page">Change dates</a></nobr>'
				+ '</span><div id="newDates"></div>');

			$('#changeDates').click(function(){
				_gaq.push(['_trackEvent', 'Interaction', 'changeDates']);
				setupChangeDates();
			});

			$('#cancelChangeDates').click(function(){
				_gaq.push(['_trackEvent', 'Interaction', 'cancelChangeDates']);
				$("#newDates").css('display','none');
			});
			$('#thDate').attr('title','Click to Sort by Event Date, Timezone '+cnMF.tz.name);

		}
		
		_gaq.push(['_trackEvent', 'Loading', 'calenders', 'calendarInfo.totalEvents', calendarInfo.totalEvents]);
		_gaq.push(['_trackEvent', 'Loading', 'calender-calendarInfo.gcLink', calendarInfo.gcLink]);

		//updateStatus2('Found '+ calendarInfo.totalEvents +' ('+calendarInfo.totalEntries+') events, '+ uniqAddrCount +' unique addresses, decoding .. ');
		cnt = cnMF.myGeo.count();
		
		updateStatus2('Found '+ cnMF.myGeo.numAddresses +' events, '+ cnt.uniqAddrTotal +' unique addresses, decoding .. ');
	}

	// cbGeoDecodeAddr() called everytime we get a response from the internet
	function cbGeoDecodeAddr () {
		cnt = cnMF.myGeo.count();
		updateStatus2(cnt.uniqAddrDecoded +' of '+ cnt.uniqAddrTotal +' decoded<br>' + cnt.uniqAddrErrors +' errors' );
		cnMF.reportData.uniqAddrDecoded = cnt.uniqAddrDecoded;
		cnMF.reportData.uniqAddrTotal  = cnt.uniqAddrTotal;
		cnMF.reportData.uniqAddrErrors = cnt.uniqAddrErrors;
		
		// if user has NOT interacted with map, 
		// AND its been over 3000 ms since last updated map with results from
		// newly decoded addresses (we don't want to update map too frequently),
		// THEN update the loading map 
		if (cnMF.reportData.userInteracted) {
			return;
		}
		var now = new Date().getTime();
		if (lastUpdate4MapLoad) {
			if (3000 < (now - lastUpdate4MapLoad)) {
					updateLoadingMap();
			}
		} else {
			lastUpdate4MapLoad = now;
		}
	}

	function cbUserInteracted() {
		if (cnMF.reportData.userInteracted) {
			// already recorded first user interaction
			return;
		}
		GEvent.removeListener(mapClickListener);
		GEvent.removeListener(mapDragstartListener);
		cnMF.reportData.userInteracted = '' + new Date().getTime();
		cnMF.reportData.userInteracted = cnMF.reportData.userInteracted.replace(/(\d{3})$/,".$1"); // add period so its secs.msec
		debug.log("cnMF.reportData.userInteracted ",cnMF.reportData.userInteracted);
	}
	function updateLoadingMap() {
		// only showing all events (move from chicago to NY, zoom out, etc) IF
		// - user has not specified a specific zoom (handled in index.php logic and passed to us via mapAllOnInit)
		// - user has not already started interacting with the map
		if (cnMFUI.opts.mapAllOnInit && !cnMF.reportData.userInteracted) {
			cnMF.mapAllEvents();
		} else {
			mapRedraw();
		}
	}
	// cbGeoDecodeComplete() called once all addresses are decoded for a given calendar
	function cbGeoDecodeComplete() {
		debug.log("cbGeoDecodeComplete() begins");
		//if (cnMFUI.opts.mapCenterLt == cnMFUI.defaults.mapCenterLt)

		cnMF.reportData.submitTime = '' + new Date().getTime();
		cnMF.reportData.submitTime = cnMF.reportData.submitTime.replace(/(\d{3})$/,".$1"); // add period so its secs.msec
		debug.info("cbGeoDecodeComplete() post cnMF.reportData:", cnMF.reportData);

		_gaq.push(['_trackEvent', 'Loading', 'calenders', 'uniqAddrDecoded', cnMF.reportData.uniqAddrDecoded]);
		_gaq.push(['_trackEvent', 'Loading', 'calenders', 'uniqAddrTotal', cnMF.reportData.uniqAddrTotal]);
		_gaq.push(['_trackEvent', 'Loading', 'calenders', 'uniqAddrErrors', cnMF.reportData.uniqAddrErrors]);
		_gaq.push(['_trackEvent', 'Loading', 'calenders', 'totalGeoDecodes', 1]);
		_gaq.push(['_trackEvent', 'Loading', 'calenders', 'totalGeoDecodeMsecs', parseInt(cnMF.reportData.submitTime.replace(/\./,'')) - parseInt(cnMF.reportData.loadTime.replace(/\./,''))]);
		// only script tag can bypass same-origin-policy, so use jsonp hack by adding callback=?
		// note that URL limit is 1024 (?) chars, so can't send too much data
		//$.post("http://chadnorwood.com/saveJson/", {sj: cnMF.reportData});
		$.getJSON("http://chadnorwood.com/saveJson/?callback=?", {sj: cnMF.reportData});
		
		updateLoadingMap();
	}


	  init();
	  return this;

	}  // end cnMFUI_init()



  //
  // private functions
  //

  // generated from stringify
  var fakeMarkersList = [ {
		"lt": 41.9761944,
		"lg": -87.6683946,
		"isDisplayed": false,
		"type": 0,
		"name": "Midsommarfest ",
		"desc": "http://blog.andersonville.org/2009/05/19/midsommarfest-lineup-is-set/\n\nNow that is seems like it may stay on the warm side weather-wise, it is time for Andersonville lovers everywhere to turn their attention to the official kickoff of the summer festival season - Midsommarfest!  This year’s festival takes place on Saturday, June 13 and Sunday June 14 from 11:00 am - 10:00 pm both days and promises to once again be (in our humble opinion) the best party in the city.  We will have delicious food, great vendors, cold beer and 4 stages of music for your carefree dancing pleasure.  The line up on all 4 stages is now final - see it after the jump!\n",
		"addrOrig": "5200 N Clark St, chicago IL",
		"addrToGoogle": "5200 N Clark St, chicago IL",
		"addrFromGoogle": "5200 N Clark St, Chicago, IL 60640, USA",
		"gCalId": "feeb95353vsqr0fo6v5sr796a0@google.com",
		"url": "http://www.google.com/calendar/event?eid=ZmVlYjk1MzUzdnNxcjBmbzZ2NXNyNzk2YTAgdmYzdTdzNm9kajByNzRxNGxybmI3MzBwaGtAZw",
		"dateStart": "2009-06-13T16:00:00Z",
		"dateEnd": "2009-06-15T03:00:00Z",
		"id": 0
	  },
	  {
		"lt": 41.8843101,
		"lg": -87.6199999,
		"isDisplayed": false,
		"type": 0,
		"name": "Chicago Blues Festival @ Grant Park",
		"desc": "http://blog.andersonville.org/2009/05/19/midsommarfest-lineup-is-set/\n\nNow that is seems like it may stay on the warm side weather-wise, it is time for Andersonville lovers everywhere to turn their attention to the official kickoff of the summer festival season - Midsommarfest!  This year’s festival takes place on Saturday, June 13 and Sunday June 14 from 11:00 am - 10:00 pm both days and promises to once again be (in our humble opinion) the best party in the city.  We will have delicious food, great vendors, cold beer and 4 stages of music for your carefree dancing pleasure.  The line up on all 4 stages is now final - see it after the jump!\n",
		"addrOrig": "337 E Randolph Dr, Chicago, IL",
		"addrToGoogle": "337 E Randolph Dr, Chicago, IL",
		"addrFromGoogle": "337 E Randolph Dr, Chicago, IL 60601, USA",
		"gCalId": "1fnj382f9ne17v02a0msigjup4@google.com",
		"url": "http://www.google.com/calendar/event?eid=MWZuajM4MmY5bmUxN3YwMmEwbXNpZ2p1cDQgdmYzdTdzNm9kajByNzRxNGxybmI3MzBwaGtAZw",
		"dateStart": "2009-06-13T17:00:00Z",
		"dateEnd": "2009-06-14T03:00:00Z",
		"id": 1
	  },
	  {
		"lt": 41.922587,
		"lg": -87.706474,
		"isDisplayed": false,
		"type": 0,
		"name": "Karolina's Chili Bday",
		"desc": "http://blog.andersonville.org/2009/05/19/midsommarfest-lineup-is-set/\n\nNow that is seems like it may stay on the warm side weather-wise, it is time for Andersonville lovers everywhere to turn their attention to the official kickoff of the summer festival season - Midsommarfest!  This year’s festival takes place on Saturday, June 13 and Sunday June 14 from 11:00 am - 10:00 pm both days and promises to once again be (in our humble opinion) the best party in the city.  We will have delicious food, great vendors, cold beer and 4 stages of music for your carefree dancing pleasure.  The line up on all 4 stages is now final - see it after the jump!\n",
		"addrOrig": "2245 N. Kedzie blvd Apt. 1, chicago",
		"addrToGoogle": "2245 N. Kedzie blvd Apt. 1, chicago",
		"addrFromGoogle": "2245 N Kedzie Blvd, Chicago, IL 60647, USA",
		"gCalId": "7be2naloepse2urkp1dt3vbjpc@google.com",
		"url": "http://www.google.com/calendar/event?eid=N2JlMm5hbG9lcHNlMnVya3AxZHQzdmJqcGMgdmYzdTdzNm9kajByNzRxNGxybmI3MzBwaGtAZw",
		"dateStart": "2009-06-13T22:00:00Z",
		"dateEnd": "2009-06-14T03:00:00Z",
		"id": 2
	  },
	  {
		"lt": 41.879535,
		"lg": -87.624333,
		"isDisplayed": false,
		"type": 0,
		"name": "Chicago Naked Ride",
		"desc": "http://chicagonakedride.org/\n\n6pm Gathering\n9pm Ride",
		"addrOrig": "chicago",
		"addrToGoogle": "chicago",
		"addrFromGoogle": "Chicago, IL, USA",
		"gCalId": "bfldar88a32o6pk0v7h2riavts@google.com",
		"url": "http://www.google.com/calendar/event?eid=YmZsZGFyODhhMzJvNnBrMHY3aDJyaWF2dHMgdmYzdTdzNm9kajByNzRxNGxybmI3MzBwaGtAZw",
		"dateStart": "2009-06-13T23:00:00Z",
		"dateEnd": "2009-06-14T03:00:00Z",
		"id": 3
	  },
	  {
		"lt": 41.904149,
		"lg": -87.689781,
		"isDisplayed": false,
		"type": 0,
		"name": "Shayna's 30th Bday",
		"desc": "Jeff's Bday: 8pm - The 2nd Bi-annual Chicago-style Pizza Challenge! I will be ordering deep dish pizza from 4 famous Chicago pizza places. We'll vote on who truly has the best pie. \nGeno's East, Art of Pizza, Lou Malnatti's, and Pequods. (Assuming they all deliver here) Address: 1236 N Campbell Ave #3\n\n10:30pm - Wicker Park Dive Bar Tour - Going to these bars in this order:\n\n1. Rainbo Club - 1150 N Damen\n2. Happy Village - 1059 N Wolcott\n3. Goldstar - 1755 W Division\n4. Phyllis Inn - 1800 W Division\n\nMy number is 612-801-8679. Please text me to find out where we are at or headed when you're on your way. Looking forward to seeing y'all!\n\nhttp://www.facebook.com/inbox/readmessage.php?t=1047301593885#/event.php?eid=83126074267",
		"addrOrig": "1236 N Campbell Ave #3, Chicago IL",
		"addrToGoogle": "1236 N Campbell Ave #3, Chicago IL",
		"addrFromGoogle": "1236 N Campbell Ave, Chicago, IL 60622, USA",
		"gCalId": "f5vlkak8njemehkm1qccu0inko@google.com",
		"url": "http://www.google.com/calendar/event?eid=ZjV2bGthazhuamVtZWhrbTFxY2N1MGlua28gdmYzdTdzNm9kajByNzRxNGxybmI3MzBwaGtAZw",
		"dateStart": "2009-06-14T01:00:00Z",
		"dateEnd": "2009-06-14T08:00:00Z",
		"id": 4
	  },
	  {
		"lt": 41.8843101,
		"lg": -87.6199999,
		"isDisplayed": false,
		"type": 0,
		"name": "Blues Festival @ Grant Park",
		"desc": "http://blog.andersonville.org/2009/05/19/midsommarfest-lineup-is-set/\n\nNow that is seems like it may stay on the warm side weather-wise, it is time for Andersonville lovers everywhere to turn their attention to the official kickoff of the summer festival season - Midsommarfest!  This year’s festival takes place on Saturday, June 13 and Sunday June 14 from 11:00 am - 10:00 pm both days and promises to once again be (in our humble opinion) the best party in the city.  We will have delicious food, great vendors, cold beer and 4 stages of music for your carefree dancing pleasure.  The line up on all 4 stages is now final - see it after the jump!\n",
		"addrOrig": "337 E Randolph Dr, Chicago, IL (Grant Park)",
		"addrToGoogle": "337 E Randolph Dr, Chicago, IL ",
		"addrFromGoogle": "337 E Randolph Dr, Chicago, IL 60601, USA",
		"gCalId": "a2p6976vtpdb8vmtv43avp8gdk@google.com",
		"url": "http://www.google.com/calendar/event?eid=YTJwNjk3NnZ0cGRiOHZtdHY0M2F2cDhnZGsgdmYzdTdzNm9kajByNzRxNGxybmI3MzBwaGtAZw",
		"dateStart": "2009-06-14T17:00:00Z",
		"dateEnd": "2009-06-15T03:00:00Z",
		"id": 5
	  }
	];



  //
  // mapFilter obj: helper data and functions, globally accessible
  //
  window.cnMFUI = {

	//
	// default options, can be overwritten when calling mapFilter() or like this:
	// cnMFUI.defaults.gCalDays = 3;
	//
	defaults:  {
		startDay: 0,
		endDay: 42,
		jumpTxt: "Jump to City, Address, or Zip",

		// div id's used by mapFilter
		mapId: "MapID",
		listId: "resultsTab",
		statusId: "MapStatus",

		mapH: 800,
		mapw: 600,
		// Chicago = 41.885405,-87.626072
		mapCenterLt: '41.885405',
		mapCenterLg: '-87.626072',
		mapZoom: 14,
		mapType: 0,
		mapAllOnInit: true,

		numTableRows: 5,

		unSupportedHtml: "Unfortunately your browser doesn't support Google Maps.<br /> To check browser compatibility visit the following <a href=\"http://local.google.com/support/bin/answer.py?answer=16532&topic=1499\">link</a>.",

		googleApiKey: 'ABQIAAAAQ8l06ldZX6JSGI8gETtVhhTrRIj9DJoJiLGtM4J1SrTlGmVDcxQDT5BVw88R8j75IQxYlwFcEw6w9w' // chadnorwood.com

	},

	// cnMFUI.opts is populated by function cnMFUI_init()
	opts: {},


	// jquery.mapFilter.hItem() should be called whenever user clicks on
	// map marker or clicks on name in results tab,
	// Opens info window for marker and highights name in results tab
	hItem: function(n, cur) {

		/*
		CHAD TODO:
		- highlight: when marker highlights more than 1 event, need 2 highlights - brighter shade for current one, and less bright for all others at same location
		- make event list move to highlighted event (jscrollpane - update css: top)
		*/

		if (typeof n == 'number') {
			// clicked on list, only one to be displayed in map info window
			kks = [n];
			gMrkr = cnMF.myMarkers.getGoogleMarker(cnMF.eventList[n].getCoordsStr());
		} else if (typeof n == 'string') {
			// n is coordinaetes string.  clicked on map, could be more than one event
			kks = cnMF.myMarkers.getEvents(n);
			gMrkr = cnMF.myMarkers.getGoogleMarker(n);
		}

		if (!cur) cur = 0;
		infoHtml = cnMF.eventList[kks[cur]].infoHtml;
		if (kks.length > 1) {
			href = '<a href="javascript:void(0)" onclick="cnMFUI.hItem(\''+ n +'\',';
			prev =  (cur == 0) ? '' : href + (cur-1) +')">&lt;&lt; prev</a> - ';
			next =  (cur == (kks.length-1)) ? '' : ' - '+ href + (cur+1) + ')">next &gt;&gt;</a> ';
			infoHtml += "<p><div style='text-align:center'>"+ prev +"Showing "+ (cur+1) +" of "+ kks.length;
			infoHtml += " Events at this location"+ next +"</div>";
		}

		  debug.log("hItem("+n+") list: ", kks);
		  debug.log("hItem("+n+") cnMFUI.opts.listId: ", cnMFUI.opts.listId);

		  // remove any previous highlights and highlight new ones
		  //$("#"+ cnMFUI.opts.listId +" a").removeClass("highlight2");
		  // TODO use this - $("a.eventNameTrigger.highlight2").removeClass("highlight2");
		  $("a.eventNameTrigger").removeClass("highlight2");
		  $("a.eventNameTrigger").click(function(){
				_gaq.push(['_trackEvent', 'Interaction', 'a.eventNameTrigger']);
		  });

		  //$("#"+ cnMFUI.opts.listId +" a[onclick*=hItem("+ kks[cur] +")]").addClass("highlight2");
		  for (var ii in kks) {
			$("#"+ cnMFUI.opts.listId +" a[onclick*=hItem("+ kks[ii] +")]").addClass("highlight2");
			$("a.eventNameTrigger[onclick*=hItem("+ kks[ii] +")]").addClass("highlight2");
		  }

		  // note - addListener setup in initResults() for map's infowindowclose event, calls mapRedraw
		  // open info window for item and center it
		  myGmap.closeInfoWindow();
		  //myGmap.panTo(gMrkr.getLatLng());
		  gMrkr.openInfoWindowHtml(infoHtml);

		  $("#ResultsMapHdrFilterByMap").css('display','none');
		  $("#ResultsMapHdrFilterFrozen").css('display','inline');

		  //mapChanged();
		  return false;
	},

	zoomTo: function(id) {
		var maxZoom = 19,
			curZoom = myGmap.getZoom(),
			newZoom = maxZoom;
		if (curZoom < maxZoom) {
			var increaseZoom = Math.floor((maxZoom - curZoom)/2);
			newZoom = curZoom + (increaseZoom > 1 ? increaseZoom : 1);
		}
		debug.warn("zoomTo(): maxZoom="+maxZoom+", curZoom="+curZoom+", newZoom="+newZoom);
		coords = cnMF.eventList[id].getCoordsStr();
		myGmap.setCenter(cnMF.myMarkers.getGoogleMarker(coords).getLatLng(), newZoom);
		//mapChanged();
	},

	jumpToAddress: function(address) {

		  // If its a street address, we want to zoom in more than if city or country
		  // For now, assuming street address if address contains a comma
		  if (address.search(/,/) == -1) {cZoom=11;} else {cZoom=16;}

		  myGmap.closeInfoWindow();
		  gGeocoder.getLatLng( address, function(point) {
			  if (!point) {
				// focus on something else so when user clicks on jumpBox again, it will clear
				$("#LogoInfo").focus;
				jumptxt = "NOT FOUND: "+ address;
				$("#jumpBox").val(jumptxt);
			  } else {
				jumptxt = '';
				myGmap.setCenter(point, cZoom);
			  }
		  });
	},

	htmlEncode:	function (value){
		  return $('<div/>').text(value).html();
	},

	htmlDecode:	function (value){
		  return $('<div/>').html(value).text();
	},

	maxStr: function(str, maxChars, maxLines, link, chopLongStrings) {
		shorten = false;

		if ((maxChars > 1) && (str.length > maxChars)) {
		  shorten = true;
		  str = str.substring(0,maxChars);
		}
		if (maxLines > 0) {
		  for (ii=0; ii >= 0;  ii=str.indexOf("\n",ii+1) ) {
			if ((ii >= 0) && (maxLines-- < 1)) {
			  shorten = true;
			  str = str.substring(0,ii);
			  break;
			}
		  }
		}
		// chopLongStrings..
		// table column width gets screwed with long strings (urls), so chop'em if longer than 15 chars!!
		var rgx = /(\S{15})(\S)/;
		if (chopLongStrings && rgx.test(str)) {
		  shorten = true;
		  var ss = str;
		  // . does not match newline - instead, use [\s\S] - http://www.regular-expressions.info/javascript.html
		  //str = str.replace(/^([\s\S]*?[^\s]{26})[\s\S]*$/, "$1 .");

		  while (rgx.test(str)) {
			str = str.replace(rgx, '$1' +' '+ '$2');
		  }
			//alert ("maxStr YES match, new:\n\n"+ str);
		  //debug.log("-- maxStr YES match, old:\n"+ss+"\n\n new:\n"+ str);
		} else {
			//alert ("maxStr NO match:\n\n"+ str);
			//debug.log ("maxStr NO match:\n\n"+ str);
		}

		if (!shorten) return str;

		if (link && link.length > 1) {
		  if (link.match(/^http/i)) link = "<a href='"+ link +"' target='_blank' title='Link To Complete Details (new page)'>more</a>";
		  return str + "..\n ("+ link +")";
		  //return str.substring(0,str.length-5) + "...\n ("+ link +")";
		}
		return str + "..";
	},

	init: cnMFUI_init

  };


})(jQuery);

