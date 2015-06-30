#  Map Filter

### Using a Map as a Filter ###

I love maps. And I love google for making maps useful, interactive, and cool.  When they released the API I wanted to use google maps as a filter.  That is, I wanted to filter location-based data based on what is viewable on the map canvas.  Google currently does this if you goto maps and do a search.  For example, search for bars and markers appear for all bars that exist on the map canvas your viewing.  The difference between that and this project is that with this project you control the data source, not google.

My first working example is GCM - Google Calendar Map.  It uses a google calendar as the data source, plotting all calendar events with a valid location on a map. This way you can control the data source by populating the calendar with whatever data you want. For more info, check out the <a href="http://chadnorwood.com/projects/gcm">GCM Project page</a> or view <a href="http://chadnorwood.com/gcm">GCM prototype</a> in action.  

### Prototype Code ###

The example code is messy.  I wanted to get something up and running so i can experiment with features. My methods often involved pasting code from other sources, so forgive me for the quality of the code.  I only recently pulled out some of the core javascript, cleaned it up, and put it in the src directory. It still could use some work, and i welcome suggestions.

### Google Calendar V3 ###

On Nov 17, 2014, Google deprecated v1 and v2 [src](http://googleappsupdates.blogspot.com/2014/10/deprecated-google-calendar-apis-v1-v2.html)
In December 2014, GCM was updated to use v3.  One of the key things in v3 is usage limits.  These are controlled by either API keys (simple, public calendars only) or OAuth (more complicated, but can get private calendar data).  GCM uses API keys, which are tied to domains. 

Therefore, **If you want to run this from any domain besides chadnorwood.com, you need to**

1. Generate your own API key - https://developers.google.com/api-client-library/javascript/start/start-js#Setup
1. Replace API key in <a href='https://github.com/chadn/mapfilter/blob/development/examples/gcm/js/cnMapFilter.js'>examples/gcm/js/cnMapFilter.js</a>  with your key - search js for "Google API Key"

### License ###

This code is released under the terms of the [MIT license](LICENSE).

The MIT License is simple and easy to understand and it places almost no restrictions on what you can do.
You are free to use in any other project (even commercial projects) as long as the copyright header is left intact.



[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/6280089702654e2e4bd7e4dc622097df "githalytics.com")](http://githalytics.com/chadn/mapfilter)
