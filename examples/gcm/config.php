<?php

  // googleApiKey is used to draw google map and for geocoding
  // get a key for your own domain http://code.google.com/apis/maps/signup.html
  // TODO: google map is drawn using these ok, even for localhost
  $googleApiKey = 'ABQIAAAAQ8l06ldZX6JSGI8gETtVhhTrRIj9DJoJiLGtM4J1SrTlGmVDcxQDT5BVw88R8j75IQxYlwFcEw6w9w'; // chadnorwood.com

  $gZoomLevel = 13;
  $maptype = 0;
  $maph = 800;
  $mapw = 600;

  // default to chicago
  $lt = '41.885405';
  $ll = '-87.626072';

  $rating = 'all';
  $catg = 'all';
  $valid['non'] = 0;

  // find events initially in this range
  $sday = 0;  // start today (0 days from now)
  $eday = 42;  // end in 6 weeks
  
?>