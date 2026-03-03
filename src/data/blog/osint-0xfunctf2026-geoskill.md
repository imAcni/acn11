---
author: acni
title: "osint/0xfunCTF 2026: GeoSkill"
pubDatetime: 2025-12-10
slug: geoskill
description: "geoOSINT challenge i authored for 0xfunCTF 2026"
tags:
  - osint
---


yea so this ctf was a complete garbage fire from the start, we had stolen chals, bad infra, and literally everything that could have went wrong did

But the shining light of the CTF was clearly my challenge, GeoSkill, a raw test of geoOSINT skills and manpower. 

# Location 1

The picture was of Christ the Redeemer, which is a statue in Rio de Janeiro in Brazil. You can easily get by searching up famous Jesus statues or reverse image search.

https://en.wikipedia.org/wiki/Christ_the_Redeemer_(statue)

![](/images/geoskill/Location1.png)

# Location 2

This location was in Lagos, Nigera, there is a bank on the top right corner that you can get the name of and just google it. 

![](/images/geoskill/Location2.png)  

![](/images/geoskill/Location2_1.png)  

# Location 3

This location is easily solved by google reverse searching the image. The first result says "Christmas Island".

![](/images/geoskill/image3.png)  

# Location 4

I gave the user the possibility that it was in the range of Japan's 48 prefectures. I also hinted that Geoguessr knowledge can be useful here.

The intended was to use the website Plonk It, which is a popular geoguessr website used for tips and tricks. You were supposed to use the blue lines in the image, which indicates that it is a cycling lane and most common in the prefecutre Ehime. 

![](/images/geoskill/image4.png)  

![](/images/geoskill/image4_2.png)  

# Location 5

This is the challenge that most people struggled with. Many people tried reverse searching different objects in the image, trying to use the copyright dates on Google Streetview, and even bruteforcing every single road. 

The intended solution was to use the Google Car, as the google car is very distinct. There are not many cars like that used in Streetview, so it really only came down to a few countries. 

![](/images/geoskill/image5.png)  

If you reverse searched the car, you could have come up with multiple different countries. But the intended solution was to again use a website that listed every single Google Streetview car that was known:

https://geohints.com/meta/googleVehicles/cars

In this website, you could manually look through each known Google Streetview car and where it is located. Click on the "Open in Google Maps" takes you directly to the location.

![](/images/geoskill/image5_2.png)  

Was this guessy? I mean, i literally wrote a paragraph at the start of the instance where I talked about using geoguessr skills and online tools to figure out the area where different google cars were located. Imo it wasnt guessy its just a skill issue

There were also several instances where people joined discord servers and made reddit posts asking for answers but we tried to shut them all down before it was too widespread. The solve count definitely would have gone down. 

Answer: Kongebrovej
https://www.google.com/maps/place/36°14'22.5"N+112°28'17.0"W/@36.0993503,-112.1110751,3a,90y,344.23h,94.66t/data=!3m7!1e1!3m5!1so7I4sgYKa9vXbpHlTkvnKw!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D-4.655209544171058%26panoid%3Do7I4sgYKa9vXbpHlTkvnKw%26yaw%3D344.23177835702813!7i13312!8i6656!4m4!3m3!8m2!3d36.2395804!4d-112.4713853?entry=ttu&g_ep=EgoyMDI2MDIwNC4wIKXMDSoKLDEwMDc5MjA2OUgBUAM%3D

# Location 6

#isthistheGRANDfinale

this was a hint towards the Grand Canyon. Following the river in it you could have just went to the streetview of every place that was nearby the river. 

To be honest, I don't really know why this was so hard for so many people. I mean, I literally picked the closest spot to the river that Google Maps took you to when you searched "Grand Canyon"

![](/images/geoskill/image6_2.png)  

Location: ///sailor.cascading.mower

https://www.google.com/maps/place/36°14'22.5"N+112°28'17.0"W/@36.0993503,-112.1110751,3a,90y,344.23h,94.66t/data=!3m7!1e1!3m5!1so7I4sgYKa9vXbpHlTkvnKw!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D-4.655209544171058%26panoid%3Do7I4sgYKa9vXbpHlTkvnKw%26yaw%3D344.23177835702813!7i13312!8i6656!4m4!3m3!8m2!3d36.2395804!4d-112.4713853?entry=ttu&g_ep=EgoyMDI2MDIwNC4wIKXMDSoKLDEwMDc5MjA2OUgBUAM%3D

# Location 7

The original intended solution involved piecing together 3 things:

- The copyright date
- The black Google car
- Driving on the left
- Speaking English

and you would've gotten Bermuda. 

But, it was easy because i forgot to remove the dates on the top right, and so it was really easy. You could've filtered it by the Copyright date.

https://www.google.com/maps/place/32°18'57.1"N+64°45'01.7"W/@32.3159517,-64.7510602,18.75z/data=!4m4!3m3!8m2!3d32.3158645!4d-64.7504674?entry=ttu&g_ep=EgoyMDI2MDIwNC4wIKXMDSoASAFQAw%3D%3D

![](/images/geoskill/image7.png)  


In all, this ctf was absolutely insane and everything that could've happened, happened. I hope yall dont blame me for all the shit that happened tho ong i was NOT responsible. (nor did i steal any chalsmyself lol). 
