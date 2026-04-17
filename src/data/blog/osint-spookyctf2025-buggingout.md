---
author: acni
title: "osint/spookyCTF 2025: BuggingOut"
pubDatetime: 2025-11-01
slug: buggingout
description: "10-Part geoOSINT around NYC"
tags:
  - osint
---

This was a very long osint challenge that took us ~4 hours total to fully solve. Could have taken us less, but ran into some issues, but it is what it is. Glad to have finally solved this.

# Beginning

The challenge description was this:

```
One doomsday prepper has caught your eye, planning to steal something on October 17th, 2025. However, you were able to gain access to his camera and several photos + videos during his trip. Geolocation of these images is missing but these locations may be the clue into what he was planning to take. We have a message he planned to send to his followers and have tried working on cracking his password. What is his password? Flag format is NICC{password}.
```
The description doesn't really say much, just that file metadata is off the table.

in the PDF, it says
```
TO ALL DOOMSDAY PROPHETS
To prepare for the upcoming apocalypse you need to be ready.
I have found a hidden location that can help us survive this trial by fire!
Only those with this message will prosper, I have created a password from my recent travels.
Here is the password:
AAAAA-BBBBB-CCCCC-DDDDD-EEEEE-FFFFF-GGGGG-HHHHHH-IIIIII-JJJJJJ
I have messaged you separately with each detail.
Good luck
```

So this is how the flag format is. It also gives the details on what to put:

```
AAAAA = The number above the revolving door of image #1.
BBBBB = The year when the person this plaque is dedicated to published their essay.
CCCCC= The bill number used to rename this building.
DDDDD=The year this dog got lost.
EEEEE= DDMMYYY when this area opened.
FFFFFF = He said "No one is in the picture but more than FFFFFF others are only a a s short walk away..."
GGGGGG The date DDMMYYYY that the ssl certificate expires for the building with stacks.
HHHHHH = The year this building was designed as per the nearby marker.
IIIIII What was the expected time (24 hours ex: 1430) of the ferry's departure?
JJJJJJ = The birth year of the fictional concierge of this building.
```
The handout also comes with a bunch of media files, each pertaining to each section of the password. 

# Stage 1 - AAAAA
```
AAAAA = The number above the revolving door of image #1.
```
![AAAAAA](/images/AAAAAA.jpg)

AAAAA provides us with this picture

With this picture, all it takes is a quick reverse image search to find this building:

![AAAAAA2](/images/AAAAAA2.png)

zooming in, you can see the number clearly: 

![AAAAAA1](/images/AAAAAA1.png)

Answer is 
`` 85 ``
credits: @blknova

# Stage 2 - BBBBB
```
BBBBB = The year when the person this plaque is dedicated to published their essay.
```
![BBBBBB](/images/BBBBBB.jpg)

Using the image, you can kind of make out what seems to be a bridge and the name ``Emily``

With a quick google/AI search, it is the plaque of ``Emily Warren Roebling`` who published an essay called ``"A Wife's Disabilities"`` in 1899.

credits: @reewnat

# Stage 3 - CCCCC
```
CCCCC= The bill number used to rename this building.
```
![CCCCCC](/images/CCCCCC.jpg)

Again, with a quick google reverse image search, you can get both the building, name, and the bill that changed it. 

Link: https://www.congress.gov/bill/110th-congress/senate-bill/2837/text

credits: @reewnat

# Stage 4 - DDDDD
```
DDDDD=The year this dog got lost.
```
![DDDDDD](/images/DDDDDD.jpg)

Another reverse image search can get you the name of the sculpture: 
```
Tony Matelli's Stray Dog
```
When you search up this name and keywords "Lost", then there are several articles published in 2015 that document the artwork was stolen. Which kind of makes sense since it still is "lost"

article: https://www.artnews.com/art-news/news/hot-diggity-tony-matelli-dog-sculpture-stolen-recovered-in-new-york-3773/

credits: me $$$

# Stage 5 - EEEEE
```
EEEEE= DDMMYYY when this area opened.
```
![EEEEEE](/images/EEEEEE.jpg)

Again, with a reverse google image search, you can find the restaurant on the right's name is Teppan Territory, which opened in a market called Dekalb Market Hall. Usually these halls have multiple restaurants like a complex. So, the question is probably referring to the complex. With a google search, it opens in June 16, 2017. 

Link: https://www.facebook.com/events/dekalb-market-hall/dekalb-market-hall-grand-opening/436822653350212/?_rdc=2&_rdr

credits: @0xl3v11

# Stage 6 - FFFFF
```
FFFFFF = He said "No one is in the picture but more than FFFFFF others are only a a s short walk away..."
```
![FFFFFF](/images/FFFFFF.jpg)

Now, here is where it kind of gets complicated. After a bunch of searching, we couldn't figure out where this was. That was when I had the idea to plot all the locations on a map. I already knew they were all in NYC, so popped up google earth and examined the trail that they took. 


![FFFFFF1](/images/FFFFFF1.png)

After mapping them all, it looks like they are in a cluster, in a certain area. So, I searched all the parks around and was easily able to locate where this was. 

But what does the description mean? it says more than _____ others are a short walk away. Searching up the park, I noticed that it is known for the  Prison Ship Martyrs' Monument, in the middle of the park. Clicking on it in google maps, it says 

```
Memorial to 11,500 Americans who died on British prison ships during the Revolutionary War.
```

I got it then. its true that no is no one in the picture, but the more than _____ others are a short walk away referenced the 11,500 people who died. 

![FFFFFF2](/images/FFFFFF2.png)

Link: https://www.google.com/maps/place/Prison+Ship+Martyrs+Monument/@40.6924817,-73.976503,317m/data=!3m1!1e3!4m15!1m7!3m6!1s0x89c25a2343ce7b2b:0x2526ddba7abd465c!2sBrooklyn+Bridge!8m2!3d40.7060855!4d-73.9968643!16zL20vMGN2NGM!3m6!1s0x89c25bb6f2560153:0x42a42ec33c54a5cd!8m2!3d40.6917937!4d-73.9755288!10e1!16zL20vMGJ0bnY4?entry=ttu&g_ep=EgoyMDI1MTAyOS4yIKXMDSoASAFQAw%3D%3D

credits: me $$$

# Stage 7 - GGGGG
```
GGGGGG The date DDMMYYYY that the ssl certificate expires for the building with stacks.
```
![GGGGGG](/images/GGGGGG.jpg)

@drkasbr somehow solved this one without needing the help of the area, but the intended solve is to probably use the locations of the other answers to find this spot. 

It was easily spottable, because of the giant pillars, and just searching that area sufficed.

then find company website and run command

```
echo | openssl s_client -servername www.bnycogen.com -connect www.bnycogen.com:443 2>/dev/null | openssl x509 -noout -enddate
```

credits: @drkasbr

# Stage 8 - HHHHHH
```
HHHHHH = The year this building was designed as per the nearby marker.
```
![HHHHHH](/images/HHHHHH.jpg)

This one was close to G, and this was when we probably realized that these landmarks were all in a trail. Intended solution was probably to follow the trail and look for this house around the big pillar building. After finding it on google maps, it was too blurry to see, so I looked up the name of the building on Google, and found this website that showed the zoomed in text. 

Link: https://www.hmdb.org/m.asp?m=95831

credits: @drkasbr, me

# Stage 9 - Skipping over IIIII to JJJJJ
```
JJJJJJ = The birth year of the fictional concierge of this building.
```
![JJJJJJ](/images/JJJJJJ.jpg)

Doing JJJJJ first. 

Zooming in on the visible text on the left, you can make out "Centric Bar & Grill". Searching that on google maps, you can also find the main building in the photo. It is the hotel Continental. This hotel was featured in John Wick, and more googling gives the conceirge of the hotel in the movie, which was Lance Reddick. (the actor's) birth year was in 1962. 

Link: https://en.wikipedia.org/wiki/1_Wall_Street_Court

credits: @reewnat, @0xkakashi, @drkasbr, me

# Final Boss. IIIII. 
```
IIIIII What was the expected time (24 hours ex: 1430) of the ferry's departure?
```

After fully confirming all the other ones, we were left with this challenge. Initally, we thought that this image:

had the name "1918_(718PM)" would tell the exact time, since it looked near a ferry dock and had a feasible time. After double checking the others, we concluded that this one was wrong, and it also didn't make much sense. The IIIII handout was a video, but didn't tell us much except for the fact they were on a ferry.

First, we looked at the google earth and mapped everything out. 

![IIIIII2](/images/IIIIII2.png)

We knew that the A-I was in chronological order, since they were all in a direct line. Therefore, they started around the spot of H and ended up at J. This was on the complete other side of New York, which made sense. The ferries near it were Pier 11/Wall Streetview

And the Brooklyn Navy Yard. 

With these two images provided:

![IIIIII3](/images/IIIIII3.jpg)

![IIIIII4](/images/IIIIII4.jpg)

The names were 7:09PM and 8:04PM. I looked for where the image of 8:04PM, and it was here:

https://www.google.com/maps/place/East+River+Esplanade./@40.7029938,-74.0073357,183m/data=!3m1!1e3!4m6!3m5!1s0x89c25bef26a94d13:0x1cfd6e1418630e3c!8m2!3d40.7028611!4d-74.0077991!16s%2Fg%2F11v17_2sys?entry=ttu&g_ep=EgoyMDI1MTAyOS4yIKXMDSoASAFQAw%3D%3D

Which is right near Pier 11. So, this probably means they got off the boat near the time 8:04pm. 

Using this knowledge, I searched up what NYC ferry came in the location Brooklyn Navy Yard and Pier 11/Wall Streetview. The only one was Astoria. Using the NYC website, you can find the times of departure for each station.

![IIIIII5](/images/IIIIII5.png)

You had to select the "to" option, and compare it against Wall Street (To Wall Street) because they were leaving from Navy Yard to Wall Street. 

Going down the list, you can see the potential times that the departure is. Specifically, the one that caught the most attention was at 7:51PM, close to the 8PM time i mentioned earlier. 

Finally, using 7:51PM (or in this case 1951) you can assemble the flag. 

credits: @0xkakashi, @drkasbr, me

# Submitting the flag
submitting the flag was a whole new ctf, as ~~the admins put the wrong flag format and didnt notice~~ and GPT also kept hallucinating, leading us to go back and check our work many times. 

Finally, we assembled the flag

```
NICC{85-1899-2837-2015-16062017-11500-09122025-1858-1951-1962}
```

And we got first blood!

credits: team 0xfun

# Part 2

```
Now that you've found the hidden password, it looks like you were able to find out a small snippet of what he stole. He was spotted with a box, but we don't know what's inside. We found these clippings and we also know what's inside is something that will help other preppers be ready for the apocalypse. Also, it looks like the location where he stole it from was SOMEWHERE along their path through the city...

Flag format: NICC{NearestLandmark_WhatWasStolen_WeightOfContentsInPounds} Use all uppercase, no spaces for landmark, and use underscore to separate. Fractions should be written as decimals.
```

So we have a new challenge, finding this box on the same path. 

Using google, i searched up something like "Government Survival Supplies" and found results like this:

Link: https://www.ebay.com/itm/266911255955

So I knew what to look for. This pack wasn't right because it had a different date of pack than the one in the image. 

I took the other hint and asked AI where to find these survival supplies and gave it the general location of the google earth pins. 

It returned that the Brooklyn Bridge once had a fallout shelter, and these boxes were discovered. 

After some google digging, I found this picture that had the same date as the one in the image:

![buggingout2](/images/buggingout2.png)

Link: https://www.youtube.com/watch?v=RTMy2KTG8g4

You can see that the text says contains 40.5 pounds of crackers. 

Assembling the flag:

```
NICC{BROOKLYNBRIDGE_CRACKERS_40.5}
```

and I got 2nd blood!
