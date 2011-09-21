<?php

$basedir = preg_replace('/\?.*$/', '', $_SERVER['REQUEST_URI']);
$basedir = preg_replace('/([^\/])$/', '$1/', $basedir);

$googleApiKey = 'ABQIAAAAQ8l06ldZX6JSGI8gETtVhhTrRIj9DJoJiLGtM4J1SrTlGmVDcxQDT5BVw88R8j75IQxYlwFcEw6w9w'; // chadnorwood.com

require_once('config.php');

function validateRange($var, $min, $max, $default=false) {
    if ($default===false) $default = $min;
    if (!is_numeric($var))  return $default;
    if ($var < $min) return $min;
    if ($var > $max) return $max;
    return $var;
}

foreach (array('r','c','z','m','sz','lat','lng','sd','ed') as $val) {
	if (@$_GET[$val]) {
    	if (1 || preg_match('/^[\d\-\.]+$/',$_GET[$val])) {
			$valid[$val] = $_GET[$val];
		}
	}
}
foreach ($valid as $key => $val) {
	if ($key == 'r') $rating = validateRange($val,0,5, $rating);
	if ($key == 'c') $catg = validateRange($val,0,100, $catg);
	if ($key == 'z') $gZoomLevel = validateRange($val,1,20, $gZoomLevel); 
	if ($key == 'm') $maptype = validateRange($val,0,4, $maptype); 
	if ($key == 'lng') $ll = validateRange($val,-180,180, $ll); 
	if ($key == 'lat') $lt = validateRange($val,-180,180, $lt); 
	if ($key == 'sd') $sday = validateRange($val,-10,366, $sday); 
	if ($key == 'ed') $eday = validateRange($val,-10,366, $eday); 
	if ($key == 'sd') $sday = $val; //  support 2010-9-23
	if ($key == 'ed') $eday = $val;
	if ($key == 'sz') {
		list($mh,$mw) = split('x',$key);
		$maph = validateRange($mh,200,2000, $maph);
		$mapw = validateRange($mw,200,2000, $mapw);
	}
}
$xmlurl = isset($_GET['u']) ? $_GET['u'] : 'u';
$foo = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Vestibulum commodo mollis tortor. Ut dapibus turpis consequat quam. Nulla lacinia. Donec nunc. Donec sollicitudin. Vivamus orci. Pellentesque tempus velit vitae odio. Maecenas enim arcu, volutpat ac, viverra id, bibendum eu, felis. Vestibulum imperdiet arcu. Ut nisi. Cras vel lectus consectetuer mauris luctus ultrices. Duis fringilla pellentesque sapien.';



?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=utf-8"/>
    <title>Google Calendar Map</title>
    <meta name="title" content="GoogleMap API Source Code Generator." />
    <meta name="description" content="stuff here" />
    <meta name="keywords" content="Google Maps API, PHP, AJAX, XML, JQUERY" />
    <meta name="author" content="Chad Norwood. http://chadnorwood.com" />
    <link type="text/css" href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.1/themes/base/jquery-ui.css" rel="stylesheet" />
	<link type="text/css" href="<?=$basedir ?>css/jsDatePick_ltr.min.css" rel="stylesheet" />
    <link type="text/css" href="<?=$basedir ?>css/jScrollPane.css" rel="stylesheet" />
    <link type="text/css" href="<?=$basedir ?>css/mapFilter.css" rel="stylesheet" />
	
    <script type="text/javascript" src="http://maps.google.com/maps?file=api&amp;v=2&amp;key=<?=$googleApiKey?>"></script>
    <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"></script>
    <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.1/jquery-ui.js"></script>
	<?php /*
	<!--
	<link type="text/css" href="1.8.1/jquery.ui.accordion.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.autocomplete.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.button.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.core.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.datepicker.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.dialog.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.progressbar.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.resizable.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.slider.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.tabs.css" rel="stylesheet" />
    <link type="text/css" href="1.8.1/jquery.ui.theme.css" rel="stylesheet" />
    

    <script type="text/javascript" src="<?=$basedir?>js/jquery-1.4.2.min.js"></script>

	  <script type="text/javascript" src="http://jqueryui.com/latest/ui/ui.core.js"></script>
	  <script type="text/javascript" src="http://jqueryui.com/latest/ui/ui.resizable.js"></script>

	<script type="text/javascript" src="<?=$basedir?>tmp/jquery.ui.core.js"></script>
    <script type="text/javascript" src="<?=$basedir?>tmp/jquery.ui.widget.js"></script>
    <script type="text/javascript" src="<?=$basedir?>tmp/jquery.ui.mouse.js"></script> 
    <script type="text/javascript" src="<?=$basedir?>tmp/jquery.ui.draggable.js"></script>
    <script type="text/javascript" src="<?=$basedir?>tmp/jquery.ui.resizable.js"></script>
    <script type="text/javascript" src="<?=$basedir?>tmp/jquery.ui.dialog.js"></script>
	-->
	*/  ?>
	<script type="text/javascript" src="<?=$basedir?>js/jquery.ui.slider.chad.js"></script>
    
	<script type="text/javascript" src="<?=$basedir?>js/jsDatePick.jquery.min.1.3.js"></script>
    <script type="text/javascript" src="<?=$basedir?>js/jquery.tablesorter.min.js"></script>
    <script type="text/javascript" src="<?=$basedir?>js/jquery.tablesorter.pager.js"></script>
    <script type="text/javascript" src="<?=$basedir?>js/json2.js"></script>
    <script type="text/javascript" src="<?=$basedir?>js/jScrollPane.js"></script> 
    <script type="text/javascript" src="<?=$basedir?>js/detect_timezone.js"></script>
    <script type="text/javascript" src="<?=$basedir?>js/ba-debug.js"></script>
	<script type="text/javascript" src="<?=$basedir?>js/cnMapFilter.js"></script>
	<script type="text/javascript" src="<?=$basedir?>js/cnMapFilterUI.js"></script>
    <script type="text/javascript" src="<?=$basedir?>js/ui.tabs.js"></script>
	
<!--
    <script type="text/javascript" src="<?=$basedir?>jquery.fullcalendar.js"></script>
    <script type="text/javascript" src="http://jquery-growfield.googlecode.com/files/jquery.growfield2.ycomp.js"></script>
--> 
    <script type="text/javascript"> //<![CDATA[

    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-2767105-1']);
    _gaq.push(['_trackPageview']);
         
    (function() {
      var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
      ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();

	$(document).ready(function() {
         //$("#xmlHelpButton").click(function() { $("#xmlHelpInfo").toggle(); });


      function genLink(curData) {
        clink = window.location.pathname +'?z='+ curData.mapZoom;
        clink += '&lat='+ curData.mapCenterLt;
        clink += '&lng='+ curData.mapCenterLg;
        clink += '&m='+ curData.mapType;
        clink += '&sd='+ curData.startDay;
        clink += '&ed='+ curData.endDay;
        clink += "&u=<?=$xmlurl?>";
        return clink;
      }

  
    //
    // init mapFilter via UI wrapper
    //
	cnMFUI.init({

		// For more info on options, see 'defaults'
      containerId: "containerId",
	  mapId: "MapID",
      listId: "tableTab",
      statusId: "MapStatus",

      mapCenterLt: <?=$lt?>,
      mapCenterLg: <?=$ll?>,
      mapZoom: <?=$gZoomLevel?>,
      mapType: <?=$maptype?>,
	  mapAllOnInit: <?=(array_key_exists('z', $_GET) ? '0':'1')?>,
	  
      gCalUrl: "<?=$xmlurl?>",
      startDay: "<?=$sday?>",
      endDay: "<?=$eday?>",
      googleApiKey: "<?=$googleApiKey?>",

      mapChangeCallback: function (curData) {
        msg = "<a href='"+ genLink(curData)+"' class='jumpLink' title='Click to load URL of this map in its current state (same zoom, coords, start and end dates). Copy and paste it for email, IM, etc.'>Map Link</a>";
        $("#MapStatus").append(msg);
      }
    });
         }); // end document ready

    //]]></script>
	<!--
    <script type='text/javascript' src='http://getfirebug.com/releases/lite/1.2/firebug-lite-compressed.js'></script>
    NOTE: comment out above firebug-lite in production 
    -->


  </head>
  <body onunload="GUnload();">
  	<div id="containerId" class="containerWrap">
	</div>

<div id="myHelp" style="display:none; float:left; text-align:left;" >
	<div class='helpContainer'>	
			<h3>What is this?</h3>
			<ol>
	Google Calendar Map (GCM) puts all events with a location from a google calendar on to a google map.  The map is a filter, You can
	 zoom in and move map around to only view events that occur on the map as you see it.
			</ol>
			<ol>
	Click on the big GCM in the top right view the <a href="http://chadnorwood.com/projects/gcm/">GCM Homepage</a> with more information.
			</ol>
		    <h3>Example Calendars:</h3>
			<ol>
			<a class="actionable" href="<?=$basedir?>?ed=180&u=https://www.google.com/calendar/feeds/dnr6osjdrtn4fqpf70ep8ck1rc%40group.calendar.google.com/public/basic">Chad's Chicago: Summer Festivals and More</a><br>
			<a class="actionable" href="<?=$basedir?>?u=http://www.google.com/calendar/feeds/jo0ubvoi1gutr95kdtl1245u3g@group.calendar.google.com/public/basic">A New York Track Club</a><br>
			<a class="actionable" href="<?=$basedir?>?sd=2011-01-01&ed=2011-12-31&u=http://www.google.com/calendar/feeds/asa5k2phscdna68j9e5410v6mc@group.calendar.google.com/public/basic">2011 Trail Races</a><br>
			<a class="actionable" href="<?=$basedir?>?u=http://www.google.com/calendar/feeds/tour%2540darrellsurvey.com/public/basic">Golf Survey Tour</a><br>
			<a class="actionable" href="<?=$basedir?>?u=http://www.google.com/calendar/feeds/hhlp4gcgvdmifq5lcbk7e27om4%40group.calendar.google.com/public/basic">Pumping Station One</a><br>
			<!--
			<a class="actionable" href="<?=$basedir?>?ed=280&u=http://www.google.com/calendar/feeds/0kpsdooc45jaekidvkq626h10q9s83aa%40import.calendar.google.com/public/basic">Chad's Meetup.com over next 9 months</a><br>
			<a class="actionable" href="<?=$basedir?>?ed=180&u=http://www.google.com/calendar/feeds/vf3u7s6odj0r74q4lrnb730phk%40group.calendar.google.com/public/basic">Chicago BLVD Rollers</a><br>
			<a class="actionable" href="<?=$basedir?>?u=http://www.google.com/calendar/feeds/se3bfcjebr9q5i2mnb1q9jmvnk%40group.calendar.google.com/public/basic">Broke Hipster Demo</a><br>
			<a class="actionable" href="<?=$basedir?>?u=http://www.google.com/calendar/feeds/9n6i4cu7gsu2o97onk970v4qq8%40group.calendar.google.com/public/basic">Chicago Tech Calendar</a><br>
			-->
			</ol>
			<h3>How do I make it Go?</h3>
	<ol>First, make your calendar public (if it ain't your calendar, ask owner for XML feed URL).</ol>
	<ol>
	 <li> In the Google Calendar interface, locate "My Calendar" box on the left.
	 <li>  Click the arrow next to the calendar you need.
	 <li>  A menu will appear. Click "Share this calendar"
	 <li>  Check "Make this calendar public"
	 <li>  Make sure "Share only my free/busy information" is unchecked.
	 <li>  Click "Save"
	</ol>
	<ol>Second, find your calendar's XML feed URL</ol>
	<ol>
	 <li>  In the Google Calendar interface, locate the "My Calendar" box on the left
	 <li>  Click the arrow next to the calendar you need.
	 <li>  A menu will appear. Click "Calendar settings"
	 <li>  In the "Calendar Address" section of the screen, click the XML badge.
	 <li>  Your feed's URL will appear. Copy It
	</ol>
			<ol>Third, Paste the URL of your Google Calendar XML Feed in the box above, click "Add Cal"</ol>
	</div>
</div>

  </body>
</html>

