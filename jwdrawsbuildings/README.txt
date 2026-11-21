jwdrawsbuildings website
========================

To view it, unzip the folder and double-click index.html. It opens in your
browser, no internet needed (apart from the fonts).

  index.html            the improved version (newest first, instagram, QR code)
  original/index.html   the original version, kept exactly as it was

What's inside each version
--------------------------
  index.html        the page layout
  css/style.css     colours, fonts and spacing
  js/content.js     all the words: titles, places, dates, poems, stories,
                    facts, collections and map places
  js/images.js      the list of drawings and their sizes
  js/map-data.js    the world map outline (no need to touch)
  js/main.js        animations, gallery, map and viewer (no need to touch)
  assets/images/    every drawing, plus your logo and QR code

Adding a new drawing
--------------------
1. Save the photo in assets/images, with a short name, e.g. bridge.jpg

2. In js/images.js, add a line inside the list (width and height in pixels):
     bridge: { src: "assets/images/bridge.jpg", w: 1200, h: 900 },

3. In js/content.js, add an entry inside "const P = {", for example:
     bridge:{title:"the bridge",place:"oxford",area:"oxford",when:"december 2026",
       medium:"graphite",fx:[wash()],
       poem:["first line","second line"]},

   - area links it to a map pin (oxford, london, manchester, warwick,
     portsmouth, highlands, cornwall, newyork, florence, santorini, morocco).
     Leave it out if it's not a real place.
   - when puts it in the "newest first" timeline. Write a month and year.
   - fx is the hover animation. Copy one from a similar piece.
   - optional extras: fact:"..." and story:["paragraph","paragraph"]

4. Still in js/content.js, add the same name to a collection's items list
   under "const GROUPS", e.g. items:["radcam","bridge", ...]

Save, refresh the page, and it's there.

Putting it online
-----------------
Any free static host works. The easiest is to drag the whole unzipped folder
onto https://app.netlify.com/drop. GitHub Pages and Cloudflare Pages also work.
