CHANGELOG
=========

* This file: https://github.com/chadn/mapfilter/blob/development/changelog.rst
* Project homepage: http://chadnorwood.com/projects/gcm/
* Working example: http://chadnorwood.com/gcm/

2014-12-3
----------

* switched to Google Calendars API v3

2012-6-6 
----------

* sliders update - For IE, FF12+, and iPad, switched default to using "overlapping sliders", which is how the latest jqueryUI slider code works.
  Originally the slider handles could be dragged up until they touched, but would not overlap.
  Overlapping slider handles can be forced on by setting ``os=1`` in URL parameters. 
  Likewise, the original slider behavior can be forced on by setting ``os=0`` in URL parameters.  Example:
  http://chadnorwood.com/gcm/?gc=asa5k2phscdna68j9e5410v6mc@group.calendar.google.com&ed=5&os=0

2012-5-23 tag 0.3
------------------

* Created this changelog, which summarizes github commit msgs
* Completed upgrade from google maps v2 to v3
* Added Drawer Concept (aka right tab): Drawer can open/close by pressing +/-, it contains calendar info, date sliders, and table of matching events (all the things that used to always be present on the right side)
* Changed default from xml url for calendars to calendar id, updated Help to explain this.
* Fixed browser bugs, now works on IE7, IE8, IE9, Chrome, Safari, Firefox
* Upgraded to jquery 1.7.1 and jqueryUI 1.8.18
* Removed jScrollPane
* Updates to analytics
* Lots of code cleanup (always more to do)


2012-5-1 tag 0.2
------------------

* Created development branch
* Added multiple calendar support
* Removed php, created and merged igorrosenberg-no-php branch
* Removed ``src/cnMapFilter.js``, which was a duplicate of ``examples/gcm/js/cnMapFilter.js``
* Upgraded to jquery 1.7, began api v3 upgrade
* Updates to analytics


2011-9-21 tag 0.1, from start in 2009
-------------------------------------

* The following was originally on the project homepage, http://chadnorwood.com/projects/gcm/
* 2009-6-12 - Initial release of prototype
* 2009-8-4 - change to 200 max events (from 25)
* 2009-11-19 - updated to work with new google maps api.
* 2010-01 - made a test version using date sliders.
* 2010-6-20 - fixed slider handles so they do not overlap.
* 2010-9-12 - Second version of GCM prototype.  Initial one moved to gcm2009.
* 2011-1-9 - Added basic support for recurring events.
* 2011-3-29 - Finished some under-the-hood coding and released source code as mapfilter project on github. Read more on the GCM on github blog post.
* 2011-9-21 - Added timezone support. See details in URL Options above.



